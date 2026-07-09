# 一夜鱼龙舞 · Night of Dancing Lights

> 基于参数方程实时生成的粒子光流动画，支持三维光雕渲染与图形状态驱动的自生成音乐。

## 版本

| 版本 | 在线预览 | 说明 |
|------|---------|------|
| **V3 乐章版** | [🌐 在线预览](https://changsheng0804-blip.github.io/yeyulongwu/v3/) | 四轨总谱编排 · 音画精确同步 · 四乐章起承转合 |
| **V2 三维光雕** | [🌐 在线预览](https://changsheng0804-blip.github.io/yeyulongwu/v2/) | 3D 透视渲染 + 蒙特卡洛临界态优化预设 |
| V1 意境版 | [🌐 在线预览](https://changsheng0804-blip.github.io/yeyulongwu/) | 2D Canvas 参数曲线粒子光流 |

## V3 特性 (Fable 5 · 乐章版)

- 🥁 四轨总谱：底鼓/军鼓/踩镲 + 贝斯走根音 + 和弦垫 + 主旋律
- 🎼 字符式记谱法：一个字符 = 一个十六分音符，直接可编辑
- 🎯 音画在音频时钟 (`AC.currentTime`) 上精确对齐，非帧计数
- 🖼️ 三种鼓的差异化视觉角色：底鼓膨胀+镜头震，军鼓抖动+色移，踩镲微光
- 🎭 四乐章结构：星涡序曲 → 鱼龙行板 → 环面急板 → 球谐辉煌
- 🔄 乐章间图案/物理参数/音色同步切换，第四乐章开场自带锣声

## V2 特性

- 🎨 四套三维图案预设 + 蒙特卡洛搜索的临界态优化预设 (Top 3)
- 🎵 图形状态驱动自生成音乐（五声音阶旋律）
- 🔁 音画闭环：粒子运动 → 音乐生成，节拍脉动 → 视觉呼吸
- 🖱️ 拖拽旋转视角 · 滚轮缩放 · 点击触发冲击波 + 锣声
- ⚡ Float32Array 内存优化 + 帧率无关物理模拟
- 📱 响应式，桌面/移动端自适应
- 🚫 零外部依赖，单文件 HTML

## 技术文档

- [TECHNICAL.md](./TECHNICAL.md) — V1→V2 改进思路、代码架构、关键模块设计
- [docs/FABLE5_ANALYSIS.md](./docs/FABLE5_ANALYSIS.md) — V3 乐章版分析与 V2 对比
- [docs/V4_FUSION_DESIGN.md](./docs/V4_FUSION_DESIGN.md) — V4 融合设计：结构之骨 × 生成之血

## License

MIT
