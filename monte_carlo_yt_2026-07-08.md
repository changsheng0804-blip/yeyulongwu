# 蒙特卡洛临界态测试 — 嵌入结果

## 目标
将 V1→V2 头脑风暴中提出的"临界态"（将具未具的视觉张力）从艺术直觉转化为可度量的工程问题，通过蒙特卡洛参数搜索找到最优区间，嵌入 HTML 供人工验证。

## 方法

### 代理指标体系
将"临界感"翻译为 5 个可计算的代理指标：
1. **空间熵** (spatialScore) — 最近邻距离中位数，理想值 ~0.12
2. **时序活性** (temporalScore) — 半径/KNN 变异系数的联合高斯评分
3. **结构方向性** (structureScore) — XZ/YX 协方差矩 anisotropy
4. **脉动节奏** (pulseScore) — KNN 方差时域波动
5. **粒子活性** (activityScore) — 速度均值

复合评分 = 0.30×spatial + 0.25×temporal + 0.25×structure + 0.10×pulse + 0.10×activity

### 搜索空间
7 维参数：preset(0-3), x(-60~60), speed(0.2~3.0), particles(2000~16000), spring(1~15), swirl(0~3), trail(1~10)
3000 样本 × 150 帧 × 1500 采样粒子，种子 42 确定性随机

### 实现
monte_carlo_test.js — Node.js 单文件，约 500 行，无外部依赖
输出 monte_carlo_results.json

## 关键发现

1. **环面绸带 (preset=2) 断崖式领先** — Top 20 全部是预设 2，评分比第二名(球谐)高 3%，比星涡高 7%
2. **低弹簧 + 高漩涡 是临界态的自然组合** — Top 1 参数 spring=2.32, swirl=1.85
3. **人造天花板** — activityScore 和 structureScore 的评分函数过于宽松，几乎所有可行参数满分，实际区分度集中在 spatialScore 和 temporalScore
4. **排除的死亡区**: 高漩涡+高弹簧锁死；speed>2.5+低trail 雪花噪点；星涡+低弹簧 完全散掉

## 嵌入 HTML 的三个预设

| 名称 | 参数 | 评分 | 特征 |
|------|------|------|------|
| 🥇 流光漩涡 | p=2, x=-36, sp=1.95, spring=2.5, swirl=1.9, trail=9 | 0.899 | 高漩涡松弹簧 |
| 🥈 暗涌绸带 | p=2, x=-39, sp=1.80, spring=2.5, swirl=1.2, trail=9 | 0.898 | 中漩涡克制 |
| 🥉 沉静暗流 | p=2, x=-36, sp=0.30, spring=8.5, swirl=0, trail=8 | 0.893 | 无漩涡对照 |

非环面最佳参考也记录在代码注释中。

## 在线验证
https://changsheng0804-blip.github.io/yeyulongwu/v2/
