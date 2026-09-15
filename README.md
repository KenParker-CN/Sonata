# Sonata — 本地优先的网页音乐播放器

一个面向个人曲库、本地优先、纯浏览器运行的音乐播放器。基于 React、TypeScript、Vite 与 daisyUI（Tailwind CSS v4）。通过 File System Access API 实现跨会话的文件夹持久访问。

## 功能特性

- **本地曲库** — 只需选择一次音乐文件夹；Sonata 把元数据与封面缓存进 IndexedDB，之后每次打开都是秒开。
- **File System Access API** — 持久目录句柄，浏览器重启后不必重新选文件夹。
- **丰富的元数据** — 经由 `music-metadata-browser` 读取 ID3、Vorbis、APE、MP4 标签。支持封面、作曲家、碟号/曲号、发行日期、编码格式、位深、采样率、码率、无损标记。
- **古典友好** — 作曲家分组、作品分组、表演者与专辑艺术家分离。
- **歌词** — 支持逐行与逐词时间轴（`[mm:ss.xx]` 与 `<mm:ss>` 两种写法），双语歌词按同一时间戳成组高亮；没有时间轴的歌词按原文降级显示，不做跟随滚动。
- **音质标识** — 依据位深/采样率/码率给出实测标注（如 `16B/44.1kHz`），而非 Master/Hi-Res 之类的营销档位。
- **歌单** — 新建、排序、改名、删除、自定义封面（图片以 blob 存在 IndexedDB）。
- **播放队列** — 跨页面切换保持，支持随机、循环、下一首播放、加入队列。
- **响应式布局** — 桌面端：固定侧栏 + 可选右侧队列面板。移动端：底部抽屉式队列 + 抽屉导航。
- **主题系统** — 明暗切换带**圆形展开过渡**（View Transitions API），从主题按钮的位置向外扩散。
- **克制的视觉规范** — 全站圆角收在 1–3px，配色走 daisyUI light/dark 两套主题（由 `<html data-theme>` 决定）。
- **零配置** — 无后端、无登录、无外部服务，完全跑在浏览器里。

## 技术栈

| 层次 | 选型 |
|-------|--------|
| 框架 | React 19 + TypeScript |
| 构建 | Vite 8（`vite-plugin-node-polyfills` 提供 Buffer 等 polyfill） |
| 路由 | React Router 7 |
| UI | daisyUI 5 + Tailwind CSS v4 |
| 弹层 | Radix UI Context Menu + `@floating-ui/react` |
| 动画 | Motion（原 Framer Motion）+ View Transitions API |
| 音频 | 浏览器 `<audio>` 元素 |
| 元数据 | `music-metadata-browser` |
| 存储 | IndexedDB（`idb`） |
| 文件访问 | File System Access API（不支持时回退 `<input type="file">`） |
| 代码检查 | ESLint 10 + TypeScript ESLint |

## 项目结构

```
src/
├── components/
│   ├── animate/           # 动效组件（theme-toggler、gradient、rolling、shimmering、splitting）
│   ├── context-menus/     # 右键菜单（专辑、实体、曲目）
│   ├── data/              # 数据展示（卡片、列表行、网格、书架、lockup）
│   ├── dialogs/           # 确认框、歌单新建/编辑
│   ├── feedback/          # 空状态、404、加载、状态横幅、导入进度
│   ├── layout/            # AppLayout、Sidebar、PlayerBar、NowPlayingView、QueuePanel、QueueSidePanel、PageHeader
│   ├── media/             # CoverArt、GeneratedArt、ArtPicker、AudioQualityBadge、PlayButton、NowPlayingBars
│   ├── navigation/        # SearchInput、BackLink、ViewModeToggle、SortSelect、AlphabetIndex、LetterSection
│   ├── queue/             # QueueList
│   └── ui/                # 基础件：ContextMenu、Dialog、Drawer
├── contexts/
│   └── app.tsx            # 全局上下文（曲目、歌单、播放器、主题、侧栏等）
├── hooks/                 # useAudioPlayer、useImportManager、useMediaQuery、useSearch、useSort、useViewMode
├── pages/                 # Library、Artists、ArtistDetail、Composers、ComposerDetail、Albums、AlbumDetail、Playlists、PlaylistDetail、TrackDetail
├── services/              # customArt、libraryStore、metadata、musicFolders、restoreLibrary
├── types/                 # 类型定义（music、file-system-access）
├── utils/                 # 工具（alphabet、collate、format*、generatedArt、getAudioQualityBadge、group*、lyrics、parse*、playlist、routes、search）
├── index.css              # Tailwind v4 主题令牌 + daisyUI light/dark 主题 + 全局样式
├── App.tsx                # 根组件：状态、Provider、路由、播放器栏
└── main.tsx               # 入口
```

## 快速开始

### 环境要求

- Node.js 20+
- npm（仓库使用 `package-lock.json`）
- Chromium 系浏览器（持久文件夹访问依赖 File System Access API）

### 安装与运行

```bash
npm install
npm run dev
```

打开 http://localhost:5173

### 生产构建

```bash
npm run build
npm run preview
```

### 代码检查

```bash
npm run lint
```

## 使用流程

1. **添加音乐** — 点击侧栏的 "Add Music"，选择包含音频文件的文件夹。
2. **持久授权** — 按提示授予权限，Sonata 会记住这个文件夹。
3. **浏览** — 在曲库、艺术家、作曲家、专辑、歌单之间导航。
4. **播放** — 点击任意曲目，队列在页面切换后仍然保留。
5. **歌单** — 新建歌单、拖拽排序、自定义封面。
6. **主题** — 侧栏切换明暗，圆形展开动画从按钮处扩散。

## 关键实现

### 主题过渡（View Transitions API）
`src/components/animate/theme-toggler.tsx` 使用 `document.startViewTransition()` 配合圆形 `clip-path` 动画：旧快照保持可见，新主题从按钮中心扩散出去，中间不闪白。`src/index.css` 里 `:root { view-transition-name: root }` 让整页（含 body 背景）一起参与快照。

### 主题令牌
`src/index.css` 的 `@theme` 定义设计令牌（颜色、圆角、字体、动画），daisyUI 的 light/dark 两套主题由 `@plugin "daisyui/theme"` 声明。明暗状态以 `<html data-theme>` 为准，Tailwind 的 `dark:` 变体也重写到这里，因此不受系统偏好干扰。播放器栏与 Now Playing 覆盖层是「永远深色」的，所以只能读 `player-*` 系列令牌，不能用跟随主题的令牌。

### 音频播放
`src/hooks/useAudioPlayer.ts` 用单个 `<audio>` 元素驱动播放，对外暴露命令式接口（`playFromContext`、队列控制、seek、setVolume 等），进度与就绪状态回灌到 React 状态。

### 曲库持久化
`src/services/libraryStore.ts` 用 `idb` 存曲目、歌单与封面 blob。`src/services/restoreLibrary.ts` 在启动时复原，必要时重新申请 File System Access 句柄。命中缓存的曲目直接使用入库时保存的元数据，不会重新解析——因此新增解析能力后需要重新导入才能生效。

### 元数据解析
`src/services/metadata.ts` 经由 `music-metadata-browser` 提取标签。艺术家与专辑艺术家以原始字符串保存，展示时才由 `parseArtists()` 按 `, ; / \` 拆分。歌词取自 `common.lyrics[0]`，交给 `src/utils/lyrics.ts` 解析。

### 歌词解析
`src/utils/lyrics.ts` 同时处理三种写法：经典 `[mm:ss.xx] 整行`、角度括号逐词 `[mm:ss]<mm:ss.ff>词<…>`（双语原文与译词共用一个行时间戳）、方括号逐词 `[mm:ss]词[mm:ss]词`（分段的原始空格需保留，且可能把单词拆在相邻两段里）。没有任何时间戳的文本走 `plainLyrics()` 降级路径。

## 浏览器兼容性

| 能力 | Chrome/Edge | Firefox | Safari |
|---------|-------------|---------|--------|
| File System Access API | ✅ | ❌（回退） | ❌（回退） |
| View Transitions API | ✅ | ✅（需开关） | ✅（18.4+） |
| OKLCH 颜色 | ✅ | ✅ | ✅ |
| `<audio>` 播放 | ✅ | ✅ | ✅ |

Firefox / Safari 用户可用文件选择回退方案（每次会话重新选文件夹）。

## 许可证

MIT
