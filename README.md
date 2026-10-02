# 武大影像地图

武汉大学的个人摄影地图。地图覆盖文理、工学、信息、医学四大学部，可继续拖动浏览其他地点；视野切换框是浏览范围，不是校界。点击照片标记打开相册，点击照片放大。非学校官方网站。

## 目录

- `Figures/`：原始照片，保留在本地，不自动提交 Git（避免把所有未挑选原片公开）。
- `data/places.json`：地点、WGS84 坐标与照片信息。
- `site/`：网页源文件、Leaflet、网站展示照片。
- `docs/`：构建结果，也是 GitHub Pages 的发布目录。不要直接编辑。
- `scripts/import_photo.py`：导入 JPEG / HEIC，读取日期、GPS、相机参数，生成网页图和缩略图，不把 EXIF/GPS 嵌入生成的图片。

代码和网页展示照片随仓库保存；原始照片请另行备份。

## 本地预览

Node.js 18+ 与 Python 3。网站不需要 npm 依赖。

```sh
npm run build
npm run preview
```

打开 http://localhost:4180 。修改后重新构建并刷新。

## 添加照片

导入脚本需要 Pillow：`python3 -m pip install Pillow`。HEIC 使用 macOS 自带 sips 转换，其他系统可先转为 JPEG。

```sh
python3 scripts/import_photo.py Figures/example.HEIC \
  --place old-library --name 老图书馆 --area 文理学部 \
  --alt "夕阳下的老图书馆"
npm run build
```

新地点需要照片带 GPS，或者手动给 `--lat` 和 `--lng`（WGS84，不要直接使用高德 GCJ-02 坐标）。已有地点使用同一个 `--place`，照片会追加到相册。拍摄时间按 EXIF 的本地时间；缺失时留空，不用文件时间猜测。

地点名、简介、照片顺序可以直接编辑 `data/places.json`。首张照片作为地点列表封面。首次导入的 `playground-night` 为工学部操场（用户确认），位置取自 IMG_0966.HEIC。武汉动物园作为校外地点独立收录，标记使用园区坐标。

## 发布

GitHub 仓库：ynbsztl/wuhanuniveristymap。Pages 发布来源：main 分支 `/docs`。

```sh
npm run check
git add site data docs scripts README.md package.json .gitignore
git commit -m "Update campus photo map"
git push
```

自定义域名保存在 `site/CNAME`，构建时复制到 `docs/CNAME`。绑定在 GitHub Pages 设置中管理。

底图来自 OpenStreetMap，交互使用 Leaflet 1.9.4（BSD-2-Clause，见 vendor 中的 LICENSE）。地图瓦片按当前视野正常加载，遵循浏览器缓存，无离线预下载；依赖网络访问 tile.openstreetmap.org。地图不可用时，地点列表与本地照片仍可浏览。当前收录工学部操场夜景 1 张、武汉动物园照片 10 张、武汉博物馆照片 8 张。

## 照片文件夹

原片按地点、日期保存：

- `Figures/武汉大学/工学部操场/2025-06-15/`
- `Figures/武汉动物园/2026-06-09/`
- `Figures/武汉博物馆/2026-05-25/`

网站展示图在 `site/assets/photos/<地点>/<拍摄日期>/`，构建时同步到 `docs/assets/photos/`。后续导入脚本也按此结构生成展示图。原片保留在本地，网页照片随仓库推送。
