'use strict';
const $ = (id) => document.getElementById(id);
const state = {places: [], selected: null, photoIndex: 0, opener: null};
const regions = {
  museum: [[30.608,114.244],[30.620,114.259]],
  zoo: [[30.537,114.225],[30.552,114.248]],
  all: [[30.524, 114.346], [30.573, 114.379]],
  arts: [[30.533, 114.35], [30.547, 114.372]],
  engineering: [[30.543, 114.353], [30.558, 114.372]],
  information: [[30.524, 114.348], [30.539, 114.362]],
  medicine: [[30.556, 114.348], [30.573, 114.367]]
};
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let map;
const markers = new Map();
const text = (tag, content, className) => {
  const element = document.createElement(tag);
  element.textContent = content;
  if (className) element.className = className;
  return element;
};
function overview() {
  $('overview').hidden = false;
  $('detail').hidden = true;
  state.selected = null;
  for (const marker of markers.values()) marker.getElement()?.classList.remove('selected');
  document.querySelector('.sidebar').scrollTop = 0;
}
function showPlace(place, pan = true) {
  state.selected = place;
  $('overview').hidden = true;
  $('detail').hidden = false;
  $('place-title').textContent = place.name;
  $('place-area').textContent = place.area || '武汉大学';
  $('place-description').textContent = place.description || '';
  $('detail-count').textContent = `${place.photos.length} 张照片`;
  $('coordinate-note').textContent = `${place.latitude.toFixed(5)}° N / ${place.longitude.toFixed(5)}° E · ${place.coordinateSource || '地点坐标'}`;
  $('photos').replaceChildren();
  if (!place.photos.length) $('photos').append(text('p', '这里还没有收录照片。先在地图上逛逛，更多校园影像会陆续加入。', 'empty-state'));
  place.photos.forEach((photo, index) => {
    const wrap = document.createElement('div');
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'photo-button'; button.setAttribute('aria-label', `放大照片：${photo.alt}`);
    const image = document.createElement('img');
    image.src = photo.thumbnail; image.alt = photo.alt; image.width = photo.width; image.height = photo.height;
    button.append(image); button.addEventListener('click', () => openPhoto(index, button));
    const meta = text('p', '', 'photo-meta');
    if (photo.date) {
      const time = text('time', `${photo.date.replaceAll('-', '.')} ${photo.time || ''}`); time.dateTime = photo.date; meta.append(time, document.createElement('br'));
    }
    if (photo.camera) meta.append(text('span', photo.camera), document.createElement('br'));
    if (photo.settings) meta.append(text('span', photo.settings));
    wrap.append(button, meta); $('photos').append(wrap);
  });
  for (const [id, marker] of markers) marker.getElement()?.classList.toggle('selected', id === place.id);
  if (map && pan) map.setView([place.latitude, place.longitude], Math.max(map.getZoom(), 16), {animate: !reducedMotion});
  document.querySelector('.sidebar').scrollTop = 0;
  $('place-title').focus({preventScroll:true});
}
function renderList() {
  $('place-list').replaceChildren();
  $('place-count').textContent = `${state.places.length} 个地点`;
  if (!state.places.length) $('place-list').append(text('p', '还没有收录照片，可以先拖动地图浏览校园。', 'empty-state'));
  state.places.forEach((place, index) => {
    const card = document.createElement('button'); card.type = 'button'; card.className = 'place-card';
    if (place.photos[0]) {
      const image = document.createElement('img'); image.src = place.photos[0].thumbnail; image.alt = place.photos[0].alt;
      card.append(image);
    }
    const copy = text('span', '', 'card-copy');
    const title = text('span', '', 'card-title');
    title.append(text('strong', place.name), text('small', `${place.photos.length} 张照片`));
    copy.append(title, text('span', place.photos[0]?.date?.replaceAll('-', '.') || '等待记录', 'card-date'));
    card.append(copy); card.addEventListener('click', () => showPlace(place)); $('place-list').append(card);
    if (map) {
      const marker = L.marker([place.latitude, place.longitude], {
        title: `查看${place.name}的照片`, alt: `查看${place.name}的照片`,
        icon: L.divIcon({className: 'photo-pin', html:`<div class="pin-inner"><span>${String(index + 1).padStart(2,'0')}</span></div>`,iconSize:[42,42],iconAnchor:[21,42]}),
        riseOnHover:true, bubblingMouseEvents:false
      }).addTo(map);
      marker.getElement()?.setAttribute('aria-label', `查看${place.name}的照片`);
      marker.bindTooltip(text('span', place.name), {permanent:true,direction:'bottom',offset:[0,8],className:'place-label'});
      marker.on('click', () => showPlace(place)); markers.set(place.id, marker);
    }
  });
}
function showPhoto(index) {
  const photos = state.selected.photos;
  state.photoIndex = (index + photos.length) % photos.length;
  const photo = photos[state.photoIndex];
  $('large-photo').src = photo.src; $('large-photo').alt = photo.alt;
  $('large-caption').textContent = `${state.selected.name} · ${state.photoIndex+1} / ${photos.length}${photo.date ? ' · '+photo.date : ''}`;
  $('previous').disabled = $('next').disabled = photos.length < 2;
}
function openPhoto(index, opener) {
  state.opener = opener; showPhoto(index); $('lightbox').showModal(); document.documentElement.classList.add('viewing');
}
$('close-lightbox').addEventListener('click', () => $('lightbox').close());
$('lightbox').addEventListener('close', () => { document.documentElement.classList.remove('viewing'); state.opener?.focus({preventScroll:true}); });
$('lightbox').addEventListener('click', (event) => {if (event.target === $('lightbox')) $('lightbox').close();});
$('previous').addEventListener('click', () => showPhoto(state.photoIndex - 1));
$('next').addEventListener('click', () => showPhoto(state.photoIndex + 1));
$('lightbox').addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); showPhoto(state.photoIndex + (event.key === 'ArrowLeft' ? -1 : 1)); }
});
$('back').addEventListener('click', () => {overview(); document.querySelector('.place-card')?.focus({preventScroll:true});});
function fitRegion(region) {
  if (!map) return;
  map.fitBounds(regions[region], {paddingTopLeft:[32,82],paddingBottomRight:[32,48],animate:!reducedMotion});
}
$('area').addEventListener('change', (event) => fitRegion(event.target.value));
$('reset-map').addEventListener('click', () => { $('area').value = 'all'; fitRegion('all'); overview(); });
function startMap() {
  if (!window.L) { $('map-status').textContent = '地图暂时无法加载，仍可从地点列表查看照片。'; return; }
  map = L.map('map', {zoomControl:false, minZoom:3, maxZoom:19});
  L.control.zoom({position:'topright'}).addTo(map);
  fitRegion('all');
  let successfulTiles = 0;
  const tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom:19, attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'});
  tileLayer.on('tileload', () => {successfulTiles++; $('map-status').hidden = true;});
  tileLayer.on('tileerror', () => {if (!successfulTiles) {$('map-status').hidden=false; $('map-status').textContent='底图暂时无法加载，你仍可点击标记或地点列表查看照片。';}});
  tileLayer.addTo(map);
  map.on('click', (event) => showPlace({id:'unrecorded',name:'尚未记录的地点',area:'武汉大学影像地图',latitude:event.latlng.lat,longitude:event.latlng.lng,photos:[],coordinateSource:'地图选点'}, false));
  new ResizeObserver(() => map.invalidateSize()).observe($('map'));
}
async function start() {
  startMap();
  try {
    const response = await fetch('places.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json(); state.places = data.places; renderList();
  } catch (error) {
    $('place-list').replaceChildren(text('p','相册暂时无法加载，请刷新页面重试。','empty-state'));
    $('place-count').textContent = '加载失败'; console.error('Album loading failed:',error);
  }
}
start();
