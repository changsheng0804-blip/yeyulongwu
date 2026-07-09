# V5 文字成形修复

## 根本问题诊断

原 `genTextAnchors` 有三个缺陷导致文字不成形:

| 问题 | 原因 | 修复 |
|------|------|------|
| XY 缩放不均 | scaleX 用 1.9/mw, scaleY 用 1.0/h, 文字横向拉伸纵向压扁 | 统一 scale=1.4/h, X 和 Y 同比例 |
| 无立体感 | Z 厚度仅 0.5 单位,随机偏移 | 5 层 Z 切片, 总厚度 1.3 单位 |
| 采样不足 | 512×160 Canvas + 阈值 128, 中文字体笔画细时亮像素不够 | 1024×256 Canvas + 阈值 80(含亚像素) |
| 字号反复设置 | set font → measure → 可能 set font 但 scale 用的旧 metrics | 设置最终 font 后重新 measure |

## 修复后的立体文字架构

```
1024×256 离屏 Canvas
  ↓ renderText(fontSize=自适应)
  ↓ getImageData → 阈值>80 收集亮像素
  ↓ 
5 层 Z 切片, 每层 N/5 粒子
  Z = -0.325, -0.1625, 0, +0.1625, +0.325
  每层独立随机采样亮像素 + 微小噪声
  ↓
Fisher-Yates 全局洗牌
  ↓
统一 scale="高度=1.4 单位", 居中, 不扭曲
```

## 文件
v5/index.html, 未提交
