/**
 * 一夜鱼龙舞 V2 — 蒙特卡洛参数空间搜索
 * 
 * 目标：在 7 维参数空间中，通过蒙特卡洛采样找到
 * "临界态"区域——粒子既有结构又未完全定型，
 * 处于"将具未具"的视觉张力区间。
 * 
 * 使用方法：
 *   node monte_carlo_test.js [--samples 5000] [--frames 300] [--seed 42]
 */

const fs = require('fs');
const path = require('path');

// ==================== 7 维参数空间定义 ====================
const PARAM_SPACE = {
  preset:    { type: 'int',     min: 0, max: 3 },                          // 图案
  x:         { type: 'float',   min: -60, max: 60 },                       // 形态参数
  speed:     { type: 'float',   min: 0.2, max: 3.0 },                      // 动画速度
  particles: { type: 'int',     min: 2000, max: 16000, step: 500 },         // 粒子数量（实际用 3000 加速）
  spring:    { type: 'float',   min: 1, max: 15 },                         // 跟随力
  swirl:     { type: 'float',   min: 0, max: 3 },                          // 漩涡力
  trail:     { type: 'int',     min: 1, max: 10 },                         // 光迹长度
};

const PI2 = Math.PI * 2;
const NMAX = 16000;

// ==================== 四套三维公式（精简版，仅计算统计量） ====================
function seedRandom(i, N, arrs) {
  // 确定性随机：用乘法哈希代替 Math.random()
  const hash = (s) => { s = Math.imul(s ^ (s >>> 16), 0x45d9f3b); s = Math.imul(s ^ (s >>> 16), 0x45d9f3b); return (s ^ (s >>> 16)) >>> 0; };
  const h = hash(i + 1);
  return [
    (h & 0xFFFF) / 0x10000,
    (hash(h) & 0xFFFF) / 0x10000,
    (hash(hash(h)) & 0xFFFF) / 0x10000,
    (hash(hash(hash(h))) & 0xFFFF) / 0x10000,
  ];
}

function computeTarget(i, N, t, mm, preset, R) {
  const u = i / N;
  if (preset === 0) {
    const s = u * PI2;
    const cx = 1.25 * Math.sin(2 * s + t * 0.40);
    const cy = 0.90 * Math.sin(3 * s + t * 0.31) * (1 + 0.35 * mm);
    const cz = 1.25 * Math.sin(4 * s + t * 0.27 + mm * 2);
    const th2 = R[0] * PI2 + t * (0.4 + R[1] * 0.8);
    const rt = 0.05 + 0.17 * Math.pow(Math.abs(Math.sin(s * 6 - t * 1.5)), 1.5) * (1 + 0.5 * Math.abs(mm));
    return [
      cx + rt * Math.cos(th2),
      cy + rt * Math.sin(th2) * 0.8,
      cz + rt * Math.sin(th2 + s * 3)
    ];
  } else if (preset === 1) {
    const zn = 1 - 2 * ((i + 0.5) / N);
    const rxy = Math.sqrt(Math.max(0, 1 - zn * zn));
    const phi = i * 2.39996323;
    const theta = Math.acos(zn);
    const h = 3 + mm * 2.5;
    const m1 = Math.floor(h);
    const fr = h - m1;
    const base = Math.sin(m1 * phi + t * 0.6) * (1 - fr) + Math.sin((m1 + 1) * phi + t * 0.6) * fr;
    const r = 1.15 * (1 + 0.45 * base * Math.sin(4 * theta - t * 0.5) + 0.10 * Math.sin(7 * theta + t * 0.9));
    return [r * rxy * Math.cos(phi), r * zn, r * rxy * Math.sin(phi)];
  } else if (preset === 2) {
    const s = u * PI2;
    const q = 3 + mm * 2;
    const Rr = 1.05 + 0.42 * Math.cos(q * s + t * 0.6);
    const ang = 2 * s + t * 0.25;
    const sp = 0.06 * (0.5 + R[1]);
    return [
      1.15 * Rr * Math.cos(ang) + sp * Math.cos(R[0] * PI2 + t),
      0.72 * Math.sin(q * s + t * 0.6) + sp * Math.sin(R[2] * PI2 + t * 1.3),
      1.15 * Rr * Math.sin(ang) + sp * Math.sin(R[0] * PI2 + t),
    ];
  } else {
    const wind = 2.0 + (mm + 1) * 1.6;
    const rr = 0.15 + R[0] * R[0] * 1.9;
    const arm = Math.floor(R[1] * 3) / 3 * PI2;
    const ang = arm + rr * wind - t * 0.35 + (R[2] - 0.5) * 0.55 * (0.35 + rr);
    return [
      rr * Math.cos(ang),
      (R[3] - 0.5) * 0.55 * Math.exp(-rr * 1.3) + 0.03 * Math.sin(rr * 8 - t),
      rr * Math.sin(ang),
    ];
  }
}

// ==================== 单次模拟运行 ====================
function runSimulation(params, frames, sampleN) {
  const { preset, x, speed, spring, swirl, particles } = params;
  const N = Math.min(particles, sampleN || 3000); // 用采样数加速，不跑全量

  // 初始化粒子状态
  const px = new Float32Array(N), py = new Float32Array(N), pz = new Float32Array(N);
  const vx = new Float32Array(N), vy = new Float32Array(N), vz = new Float32Array(N);
  const Rstore = []; // 存储每个粒子的随机种子
  for (let i = 0; i < N; i++) {
    Rstore.push(seedRandom(i, N));
    const r = 2 * Math.cbrt(Rstore[i][0]);
    const th = Rstore[i][1] * PI2;
    const ph = Math.acos(2 * Rstore[i][2] - 1);
    px[i] = r * Math.sin(ph) * Math.cos(th);
    py[i] = r * Math.cos(ph);
    pz[i] = r * Math.sin(ph) * Math.sin(th);
  }

  let t = 0, curX = x;
  const springK = spring * 6;
  const swirlK = swirl;

  // 收集每帧的统计快照
  const snapshots = [];
  const dt = 1 / 60 * speed; // 固定 60fps 等效步长

  for (let frame = 0; frame < frames; frame++) {
    const mm = curX / 60;
    const damp = Math.exp(-4.2 * dt);

    let totalDist = 0, maxDist = 0, minDist = Infinity;
    let centroidX = 0, centroidY = 0, centroidZ = 0;
    let spdSum = 0;

    const positions = [];

    for (let i = 0; i < N; i++) {
      const g = computeTarget(i, N, t, mm, preset, Rstore[i]);
      vx[i] = (vx[i] + (g[0] - px[i]) * springK * dt + (-pz[i]) * swirlK * dt) * damp;
      vy[i] = (vy[i] + (g[1] - py[i]) * springK * dt) * damp;
      vz[i] = (vz[i] + (g[2] - pz[i]) * springK * dt + (px[i]) * swirlK * dt) * damp;
      px[i] += vx[i] * dt;
      py[i] += vy[i] * dt;
      pz[i] += vz[i] * dt;

      const rsq = px[i] * px[i] + py[i] * py[i] + pz[i] * pz[i];
      if (rsq > 1600) {
        px[i] = g[0]; py[i] = g[1]; pz[i] = g[2];
        vx[i] = vy[i] = vz[i] = 0;
      }

      centroidX += px[i]; centroidY += py[i]; centroidZ += pz[i];
      spdSum += Math.abs(vx[i]) + Math.abs(vy[i]) + Math.abs(vz[i]);
      positions.push([px[i], py[i], pz[i]]);
    }

    centroidX /= N; centroidY /= N; centroidZ /= N;

    // 计算空间统计量
    let radiusSum = 0, radiusVarSum = 0;
    const radii = [];
    for (let i = 0; i < N; i++) {
      const dx = px[i] - centroidX;
      const dy = py[i] - centroidY;
      const dz = pz[i] - centroidZ;
      const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
      radii.push(r);
      radiusSum += r;
    }
    const meanRadius = radiusSum / N;
    for (let i = 0; i < N; i++) {
      radiusVarSum += (radii[i] - meanRadius) ** 2;
    }
    const radiusVar = radiusVarSum / N;

    // 计算成对距离的近似（采样避免 O(N²)）
    const pairSamples = Math.min(N, 500);
    const pairDists = [];
    for (let k = 0; k < pairSamples; k++) {
      const a = (k * 7 + 13) % N;
      const b = (k * 31 + 59) % N;
      if (a !== b) {
        const dx = px[a] - px[b];
        const dy = py[a] - py[b];
        const dz = pz[a] - pz[b];
        pairDists.push(Math.sqrt(dx * dx + dy * dy + dz * dz));
      }
    }
    const meanPairDist = pairDists.reduce((a, b) => a + b, 0) / pairDists.length;
    const pairDistVar = pairDists.reduce((a, d) => a + (d - meanPairDist) ** 2, 0) / pairDists.length;

    // 局部密度：最近邻距离分布
    const knnDists = [];
    for (let k = 0; k < Math.min(N, 200); k++) {
      const idx = (k * 53 + 17) % N;
      let minD = Infinity;
      for (let j = Math.max(0, idx - 50); j < Math.min(N, idx + 50); j++) {
        if (j === idx) continue;
        const dx = px[idx] - px[j], dy = py[idx] - py[j], dz = pz[idx] - pz[j];
        const d = dx * dx + dy * dy + dz * dz;
        if (d < minD) minD = d;
      }
      knnDists.push(Math.sqrt(minD));
    }
    const meanKnn = knnDists.reduce((a, b) => a + b, 0) / knnDists.length;
    const knnVar = knnDists.reduce((a, d) => a + (d - meanKnn) ** 2, 0) / knnDists.length;

    // 极性：粒子在 XZ 平面上是否有方向性偏好（检测螺旋/带状结构）
    let momentXZ = 0, momentYZ = 0;
    for (let i = 0; i < N; i++) {
      const dx = px[i] - centroidX;
      const dz = pz[i] - centroidZ;
      const dy = py[i] - centroidY;
      momentXZ += dx * dz;
      momentYZ += dy * dz;
    }
    momentXZ /= N; momentYZ /= N;
    const structuralAnisotropy = Math.abs(momentXZ) + Math.abs(momentYZ); // 越高越有方向性结构

    snapshots.push({
      frame,
      meanRadius,
      radiusVar,
      meanPairDist,
      pairDistVar,
      meanKnn,
      knnVar,
      structuralAnisotropy,
      meanSpeed: spdSum / N,
    });

    t += dt;
  }

  return snapshots;
}

// ==================== 指标计算 ====================
function computeMetrics(snapshots) {
  const skipFirst = 10; // 跳过前 10 帧的初始化不稳定期
  const usable = snapshots.slice(skipFirst);
  if (usable.length < 5) return null;

  const avg = (arr, key) => arr.reduce((s, x) => s + x[key], 0) / arr.length;
  const std = (arr, key) => {
    const m = avg(arr, key);
    return Math.sqrt(arr.reduce((s, x) => s + (x[key] - m) ** 2, 0) / arr.length);
  };
  const cv = (arr, key) => std(arr, key) / (Math.abs(avg(arr, key)) + 1e-8); // 变异系数

  // 一阶统计量
  const meanRadius = avg(usable, 'meanRadius');
  const cvRadius = cv(usable, 'meanRadius');        // 半径的时间变异（形态是否在变化）
  const meanKnn = avg(usable, 'meanKnn');
  const cvKnn = cv(usable, 'meanKnn');               // 局部密度的波动性
  const meanAnisotropy = avg(usable, 'structuralAnisotropy');
  const cvAnisotropy = cv(usable, 'structuralAnisotropy');
  const meanSpeed = avg(usable, 'meanSpeed');
  const pairDistVar = avg(usable, 'pairDistVar');   // 整体散布度
  const knnVar = avg(usable, 'knnVar');             // 局部聚类程度

  // ─── 临界态复合评分 ───
  // 核心逻辑：各项指标越接近"中等"越好

  // 1. 空间熵 Z-score（meanKnn 归一化：太小=过密，太大=过散）
  //    理想区间：0.05 ~ 0.25（相对于粒子空间尺度）
  const spatialScore = gaussian(meanKnn, 0.12, 0.08);

  // 2. 时序活性（cvRadius + cvKnn 联合）
  //    太小的 cv = 画面僵死；太大的 cv = 狂乱无序
  const temporalActivity = (cvRadius + cvKnn) / 2;
  const temporalScore = gaussian(temporalActivity, 0.25, 0.15);

  // 3. 结构方向性（anisotropy 中等 = 有带状/螺旋结构但不过度刚性）
  const structureScore = gaussian(meanAnisotropy, 0.4, 0.35);

  // 4. 聚合-散裂节奏（knnVar 时间波动 = 聚类不断形成又瓦解）
  const pulseScore = Math.min(1, cvKnn / 0.5);

  // 5. 粒子活性（速度不能太低，太低说明阻尼过度）
  const activityScore = Math.min(1, meanSpeed / 0.6);

  // 复合评分
  const composite = (
    spatialScore * 0.30 +
    temporalScore * 0.25 +
    structureScore * 0.25 +
    pulseScore * 0.10 +
    activityScore * 0.10
  );

  return {
    // 原始指标
    meanRadius, cvRadius, meanKnn, cvKnn,
    meanAnisotropy, cvAnisotropy, meanSpeed,
    pairDistVar, knnVar,
    // 分项评分
    spatialScore, temporalScore, structureScore, pulseScore, activityScore,
    // 综合
    composite,
  };
}

function gaussian(x, center, sigma) {
  return Math.exp(-((x - center) ** 2) / (2 * sigma * sigma));
}

// ==================== 蒙特卡洛采样 ====================
function sample(logRange = false) {
  const sample = {};
  for (const [key, spec] of Object.entries(PARAM_SPACE)) {
    if (spec.type === 'int') {
      sample[key] = Math.floor(Math.random() * (spec.max - spec.min + 1)) + spec.min;
      if (spec.step) {
        sample[key] = Math.round(sample[key] / spec.step) * spec.step;
      }
    } else {
      if (logRange && (key === 'speed' || key === 'spring' || key === 'swirl')) {
        // 对数采样：更关注低值区域
        const logMin = Math.log(spec.min + 0.001);
        const logMax = Math.log(spec.max);
        sample[key] = Math.exp(logMin + Math.random() * (logMax - logMin));
      } else {
        sample[key] = spec.min + Math.random() * (spec.max - spec.min);
      }
    }
    // 精度控制
    if (spec.type === 'float') sample[key] = Math.round(sample[key] * 100) / 100;
  }
  return sample;
}

// ==================== 主程序 ====================
async function main() {
  const args = process.argv.slice(2);
  const numSamples = parseInt(args.find(a => a.startsWith('--samples='))?.split('=')[1] || '5000');
  const numFrames = parseInt(args.find(a => a.startsWith('--frames='))?.split('=')[1] || '200');
  const seed = parseInt(args.find(a => a.startsWith('--seed='))?.split('=')[1] || '42');
  const sampleN = parseInt(args.find(a => a.startsWith('--sampleN='))?.split('=')[1] || '2000');

  // 确定性随机
  let rngState = seed;
  const rng = () => { rngState = (rngState * 1664525 + 1013904223) | 0; return (rngState >>> 0) / 0x100000000; };
  Math.random = rng; // 覆盖 Math.random 保证可复现

  console.log(`=== 一夜鱼龙舞 V2 蒙特卡洛参数空间搜索 ===`);
  console.log(`样本数: ${numSamples}, 帧数: ${numFrames}, 采样粒子: ${sampleN}, 种子: ${seed}\n`);

  const results = [];
  const startTime = Date.now();
  let lastReport = startTime;

  for (let s = 0; s < numSamples; s++) {
    const params = sample(true);
    const params2 = { ...params, particles: params.particles }; // 实际用采样粒子数

    try {
      const snapshots = runSimulation(params2, numFrames, sampleN);
      const metrics = computeMetrics(snapshots);

      if (metrics) {
        results.push({
          id: s,
          params,
          metrics,
        });
      }
    } catch (e) {
      // 跳过异常样本
    }

    // 进度报告
    if (Date.now() - lastReport > 3000) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = (s + 1) / elapsed;
      const eta = (numSamples - s - 1) / rate;
      console.log(`[${(s + 1).toString().padStart(5)}/${numSamples}] ${(rate).toFixed(0)} samples/s | ETA: ${eta.toFixed(0)}s | top composite: ${results.length > 0 ? Math.max(...results.map(r => r.metrics.composite)).toFixed(4) : 'N/A'}`);
      lastReport = Date.now();
    }
  }

  const elapsed = (Date.now() - startTime) / 1000;
  console.log(`\n完成！${results.length} 个有效样本，耗时 ${elapsed.toFixed(1)}s\n`);

  // ─── 分析 ───
  // 按复合评分排序
  results.sort((a, b) => b.metrics.composite - a.metrics.composite);

  // Top 20
  console.log('═══════════════════════════ Top 20 候选参数 ═══════════════════════════');
  console.log('排名 | 预设 | x    | 速度 | 粒子 | 弹簧 | 漩涡 | 光迹 | 综合分 | 空间 | 时序 | 结构 | 脉动 | 活性');
  console.log('-'.repeat(110));
  for (let i = 0; i < Math.min(20, results.length); i++) {
    const r = results[i];
    const p = r.params;
    const m = r.metrics;
    console.log(
      `${(i + 1).toString().padStart(3)}  | ` +
      `${['鱼龙','球谐','环面','星涡'][p.preset].padEnd(4)} | ` +
      `${p.x.toFixed(0).padStart(4)} | ` +
      `${p.speed.toFixed(1).padStart(4)} | ` +
      `${p.particles.toString().padStart(5)} | ` +
      `${p.spring.toFixed(1).padStart(4)} | ` +
      `${p.swirl.toFixed(1).padStart(4)} | ` +
      `${p.trail.toString().padStart(4)} | ` +
      `${m.composite.toFixed(4)} | ` +
      `${m.spatialScore.toFixed(3)} | ${m.temporalScore.toFixed(3)} | ${m.structureScore.toFixed(3)} | ${m.pulseScore.toFixed(3)} | ${m.activityScore.toFixed(3)}`
    );
  }

  // ─── 按预设分组分析 ───
  console.log('\n\n═══════════════════════════ 按图案分组最佳参数 ═══════════════════════════');
  for (let preset = 0; preset < 4; preset++) {
    const group = results.filter(r => r.params.preset === preset).sort((a, b) => b.metrics.composite - a.metrics.composite);
    if (group.length === 0) continue;
    const top5 = group.slice(0, 5);
    const avgX = top5.reduce((s, r) => s + r.params.x, 0) / top5.length;
    const avgSpeed = top5.reduce((s, r) => s + r.params.speed, 0) / top5.length;
    const avgSpring = top5.reduce((s, r) => s + r.params.spring, 0) / top5.length;
    const avgSwirl = top5.reduce((s, r) => s + r.params.swirl, 0) / top5.length;
    const avgTrail = top5.reduce((s, r) => s + r.params.trail, 0) / top5.length;
    const bestComp = top5[0].metrics.composite;

    console.log(`\n${['鱼龙舞','球谐光雕','环面绸带','星涡'][preset]} | Top5 均值: x=${avgX.toFixed(0)} speed=${avgSpeed.toFixed(1)} spring=${avgSpring.toFixed(1)} swirl=${avgSwirl.toFixed(1)} trail=${avgTrail.toFixed(0)} | 最高分=${bestComp.toFixed(4)}`);
  }

  // ─── 参数空间热力：找出哪些参数区间是"死亡区"（从未出现在 top 10%） ───
  console.log('\n\n═══════════════════════════ 参数区间分析 ═══════════════════════════');
  const top10pct = results.slice(0, Math.max(10, Math.floor(results.length * 0.1)));
  const bottom50pct = results.slice(Math.floor(results.length * 0.5));

  for (const [key, spec] of Object.entries(PARAM_SPACE)) {
    const topVals = top10pct.map(r => r.params[key]);
    const botVals = bottom50pct.map(r => r.params[key]);
    const topMean = topVals.reduce((a, b) => a + b, 0) / topVals.length;
    const botMean = botVals.reduce((a, b) => a + b, 0) / botVals.length;
    const topStd = Math.sqrt(topVals.reduce((s, v) => s + (v - topMean) ** 2, 0) / topVals.length);
    const topMin = Math.min(...topVals);
    const topMax = Math.max(...topVals);

    console.log(`\n${key}: 优质区间 [${topMin.toFixed(1)}, ${topMax.toFixed(1)}] | μ=${topMean.toFixed(2)} σ=${topStd.toFixed(2)} | 低分区 μ=${botMean.toFixed(2)}`);
    if (Math.abs(topMean - botMean) / (spec.max - spec.min) > 0.15) {
      console.log(`  ⚠ 此参数对临界态有显著区分力 (效应量 > 15% 范围)`);
    }
  }

  // ─── 关联分析：哪些参数组合更好 ──
  console.log('\n\n═══════════════════════════ Top 参数关联 ═══════════════════════════');
  const pairs = [
    ['spring', 'swirl'],
    ['speed', 'spring'],
    ['speed', 'swirl'],
    ['x', 'preset'],
  ];
  for (const [a, b] of pairs) {
    const topAvgA = top10pct.reduce((s, r) => s + r.params[a], 0) / top10pct.length;
    const topAvgB = top10pct.reduce((s, r) => s + r.params[b], 0) / top10pct.length;
    console.log(`  ${a}↔${b}: 优质区均值 (${topAvgA.toFixed(2)}, ${topAvgB.toFixed(2)})`);
  }

  // 保存结果
  const outPath = path.join(__dirname, 'monte_carlo_results.json');
  const output = {
    config: { numSamples, numFrames, sampleN, seed, timestamp: new Date().toISOString() },
    top20: results.slice(0, 20).map(r => ({ params: r.params, metrics: r.metrics })),
    summary_by_preset: [0, 1, 2, 3].map(p => {
      const g = results.filter(r => r.params.preset === p).sort((a, b) => b.metrics.composite - a.metrics.composite);
      return g.length > 0 ? { preset: p, topScore: g[0].metrics.composite, topParams: g[0].params } : null;
    }).filter(Boolean),
  };
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\n\n详细结果已保存到: ${outPath}`);
}

main().catch(console.error);
