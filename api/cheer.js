// api/cheer.js — Vercel Serverless Function
// 啦啦队打分云同步代理：服务端读取环境变量 SupabaseURL / SupabaseScret，前端不暴露密钥。
// 部署说明：Vercel 项目 Root Directory 设为 app（该目录含 index.html 与 api/），
// 在 Vercel 项目 Settings -> Environment Variables 配置：
//   SupabaseURL   = https://xxxx.supabase.co
//   SupabaseScret = 服务端密钥（Settings -> API -> service_role 或 anon 均可，推荐 service_role）
"use strict";

const SUPABASE_URL = process.env.SupabaseURL || "";
const SUPABASE_SECRET = process.env.SupabaseScret || "";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, apikey");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  if (!SUPABASE_URL || !SUPABASE_SECRET) {
    return res.status(500).json({ error: "Supabase 环境变量未配置（需设置 SupabaseURL / SupabaseScret）" });
  }

  const base = SUPABASE_URL + "/rest/v1/cheer_scores";
  const headers = {
    apikey: SUPABASE_SECRET,
    Authorization: "Bearer " + SUPABASE_SECRET,
    "Content-Type": "application/json",
  };

  try {
    if (req.method === "GET") {
      const r = await fetch(base + "?select=id,date,time,team,user_name,ren,dis,atm,ts&order=ts.asc", { headers });
      const rows = await r.json();
      return res.status(r.status).json(rows);
    }

    if (req.method === "POST") {
      const body = (req.body && typeof req.body === "object") ? req.body : JSON.parse(req.body || "{}");
      const payload = {
        date: String(body.date || ""),
        time: String(body.time || ""),
        team: String(body.team || ""),
        user_name: String(body.user_name || ""),
        ren: Math.max(0, Math.min(5, +body.ren || 0)),
        dis: Math.max(0, Math.min(5, +body.dis || 0)),
        atm: Math.max(0, Math.min(5, +body.atm || 0)),
        device: String(body.device || ""),
      };
      const r = await fetch(base, {
        method: "POST",
        headers: Object.assign({}, headers, { Prefer: "return=minimal" }),
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const t = await r.text();
        return res.status(r.status).json({ error: t });
      }
      return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
      const id = String(req.query.id || "");
      if (!id) return res.status(400).json({ error: "缺少 id" });
      const r = await fetch(base + "?id=eq." + encodeURIComponent(id), { method: "DELETE", headers });
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
