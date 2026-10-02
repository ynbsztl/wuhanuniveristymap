"""Import a photo into a place. HEIC conversion uses macOS sips; JPEG works anywhere."""
import argparse
import hashlib
import json
import re
import subprocess
import tempfile
from datetime import datetime
from fractions import Fraction
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]

def coordinate(values, ref):
    if not values:
        return None
    result = float(values[0]) + float(values[1]) / 60 + float(values[2]) / 3600
    return -result if ref in ('S', 'W') else result

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('photo', type=Path)
    parser.add_argument('--place', required=True, help='Stable place ID, e.g. engineering-playground')
    parser.add_argument('--name', help='Required for a new place')
    parser.add_argument('--area', default='武汉大学')
    parser.add_argument('--alt', required=True, help='Describe the photograph')
    parser.add_argument('--lat', type=float)
    parser.add_argument('--lng', type=float)
    args = parser.parse_args()
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', args.place):
        parser.error('--place must be lowercase words joined with hyphens')
    if (args.lat is None) != (args.lng is None):
        parser.error('--lat and --lng must be supplied together')
    database = ROOT / 'data/places.json'
    data = json.loads(database.read_text())
    place = next((p for p in data['places'] if p['id'] == args.place), None)
    digest = hashlib.sha256(args.photo.read_bytes()).hexdigest()[:16]
    photo_id = 'photo-' + digest
    if place and any(p['id'] == photo_id for p in place['photos']):
        print('This photograph is already in this place. No changes made.')
        return
    with tempfile.TemporaryDirectory() as tmp:
        source = args.photo.resolve()
        if source.suffix.lower() in ('.heic', '.heif'):
            target = Path(tmp) / 'photo.jpg'
            subprocess.run(['sips', '-s', 'format', 'jpeg', str(source), '--out', str(target)], check=True, stdout=subprocess.DEVNULL)
            source = target
        with Image.open(source) as original:
            exif = original.getexif()
            details = exif.get_ifd(34665)
            gps = exif.get_ifd(34853)
            latitude = args.lat if args.lat is not None else coordinate(gps.get(2), gps.get(1))
            longitude = args.lng if args.lng is not None else coordinate(gps.get(4), gps.get(3))
            if place is None:
                if not args.name or latitude is None or longitude is None:
                    parser.error('New places need --name and GPS in the photo, or explicit --lat and --lng (WGS84)')
                if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
                    parser.error('Coordinates are outside the valid range')
                place = {'id': args.place, 'name': args.name, 'area': args.area, 'latitude': latitude, 'longitude': longitude,
                         'description': '', 'coordinateSource': '手动指定（WGS84）' if args.lat is not None else '照片 GPS（WGS84）', 'photos': []}
                data['places'].append(place)
            taken = details.get(36867)
            taken = datetime.strptime(taken, '%Y:%m:%d %H:%M:%S') if taken else None
            settings = []
            if details.get(37386): settings.append(f'{float(details[37386]):.1f}mm')
            if details.get(33437): settings.append(f'f/{float(details[33437]):.2f}'.rstrip('0').rstrip('.'))
            if details.get(33434): settings.append(f'{Fraction(float(details[33434])).limit_denominator(100000)}s')
            if details.get(34855): settings.append(f'ISO {details[34855]}')
            photo = ImageOps.exif_transpose(original).convert('RGB')
            assets = ROOT / 'site/assets'
            assets.mkdir(parents=True, exist_ok=True)
            dimensions = None
            for suffix, limit in [('', 2000), ('-thumb', 720)]:
                resized = photo.copy(); resized.thumbnail((limit, limit))
                if not suffix: dimensions = resized.size
                options = {'quality': 88, 'optimize': True, 'progressive': True}
                if original.info.get('icc_profile'): options['icc_profile'] = original.info['icc_profile']
                resized.save(assets / f'{photo_id}{suffix}.jpg', **options)
            place['photos'].append({'id': photo_id, 'src': f'assets/{photo_id}.jpg', 'thumbnail': f'assets/{photo_id}-thumb.jpg',
                                    'alt': args.alt, 'date': taken.strftime('%Y-%m-%d') if taken else '',
                                    'time': taken.strftime('%H:%M:%S') if taken else '', 'camera': exif.get(272, ''),
                                    'settings': ' · '.join(settings), 'width': dimensions[0], 'height': dimensions[1]})
    database.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    print(f'Imported into {place["name"]}. Run npm run build before publishing.')

if __name__ == '__main__':
    main()
