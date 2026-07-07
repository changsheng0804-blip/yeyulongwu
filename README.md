# 一夜鱼龙舞 · Night of Dancing Lights

> 基于参数方程实时生成的旋转粒子光流动画

![screenshot](screenshot.png)

## 在线预览

🌐 **[一键预览](https://用户名.github.io/yeyulongwu/)**

## 特性

- 🎨 参数方程驱动的实时粒子光流渲染
- 🎛️ 可调节意境形态、流光速度、星火密度
- 🔄 自动变幻模式，姿态持续流转
- 📱 响应式设计，桌面/移动端自适应
- ⚡ 纯前端 Canvas 动画，无外部依赖

## 参数说明

| 滑块 | 范围 | 默认 | 说明 |
|------|------|------|------|
| 意境形态 (x) | -60 ~ 60 | -13 | 控制粒子图案的形态曲率 |
| 流光速度 | 0.2 ~ 3.0 | 0.7 | 动画播放速度 |
| 星火密度 | 2000 ~ 20000 | 7500 | 粒子总数（影响性能） |

## 技术

- HTML5 Canvas 2D
- `globalCompositeOperation: "lighter"` 叠加混合
- HSL 色彩空间金橙渐变
- requestAnimationFrame 高性能渲染循环

## 部署

直接推送到 GitHub 仓库，在 Settings → Pages 中启用 GitHub Pages（选 `main` 分支 `/ (root)`），即可获得 `https://用户名.github.io/yeyulongwu/` 链接。

## License

MIT
