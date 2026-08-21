// api/dataset.js — Vercel Serverless Function
// 比赛数据集云端同步代理：服务端读取环境变量 SupabaseURL / SupabaseScret，前端不暴露密钥。
// 云端以单行（id="active"）保存当前数据集（jsonb）。GET 取最新，POST 用 merge 覆盖更新。
// 部署说明：Vercel 项目 Root Directory 设为 app（该目录含 index.html 与 api/），
// 在 Vercel 项目 Settings -> Environment Variables 配置：
//   SupabaseURL   = https://xxxx.supabase.co
//   SupabaseScret = 服务端密钥（Settings -> API -> service_role 或 anon 均可，推荐 service_role）
"use strict";

const SUPABASE_URL = process.env.SupabaseURL || "";
const SUPABASE_SECRET = process.env.SupabaseScret || "";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, apikey");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  if (!SUPABASE_URL || !SUPABASE_SECRET) {
    return res.status(500).json({ error: "Supabase 环境变量未配置（需设置 SupabaseURL / SupabaseScret）" });
  }

  const base = SUPABASE_URL + "/rest/v1/match_dataset";
  const headers = {
    apikey: SUPABASE_SECRET,
    Authorization: "Bearer " + SUPABASE_SECRET,
    "Content-Type": "application/json",
  };

  try {
    if (req.method === "GET") {
      const r = await fetch(base + "?id=eq.active&select=id,data,updated_at,updated_by", { headers });
      const rows = await r.json();
      return res.status(200).json((rows && rows[0]) || null);
    }

    if (req.method === "POST") {
      const body = (req.body && typeof req.body === "object") ? req.body : JSON.parse(req.body || "{}");
      const payload = {
        id: "active",
        data: body.data || {},
        updated_at: new Date().toISOString(),
        updated_by: String(body.updated_by || ""),
      };
      const r = await fetch(base, {
        method: "POST",
        headers: Object.assign({}, headers, { Prefer: "resolution=merge-duplicates,return=minimal" }),
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const t = await r.text();
        return res.status(r.status).json({ error: t });
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
};
