"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus, Upload, Clock, Send, History, ChevronLeft, Trash2,
  Image as ImageIcon, RotateCcw, CheckCircle2, AlertTriangle, X
} from "lucide-react";

/* =========================================================
   CONSTANTS
========================================================= */
const PART_TITLES = { part1: "Mô tả tranh", part2: "Trả lời email", part3: "Bài luận" };
const PART_SUBTITLES = { part1: "Câu 1–5", part2: "Câu 6–7", part3: "Câu 8" };
const PART_MAX_PER_Q = { part1: 3, part2: 4, part3: 5 };
const PART_DEFAULT_MIN = { part1: 8, part2: 20, part3: 30 };
const PART_COUNT = { part1: 5, part2: 2, part3: 1 };
const START_NUM = { part1: 1, part2: 6, part3: 8 };
const ESSAY_MIN_WORDS = 300;

const SYS_PART1 = `Bạn là giám khảo chính thức chấm bài thi TOEIC Writing, phần "Viết câu mô tả tranh" (Question 1-5). Thang điểm 0-3:
- 3: câu đúng, liên quan chặt chẽ đến tranh, dùng đúng tự nhiên cả hai từ cho sẵn, ngữ pháp đúng hoặc lỗi rất nhỏ.
- 2: về cơ bản đúng và liên quan đến tranh, dùng đúng hai từ, nhưng có vài lỗi ngữ pháp nhỏ.
- 1: lỗi ngữ pháp nghiêm trọng làm khó hiểu, hoặc dùng sai một trong hai từ, hoặc không liên quan rõ đến tranh.
- 0: bỏ trắng, chép đề, không phải tiếng Anh, không phải một câu hoàn chỉnh, hoặc không liên quan đến tranh.
Chấm khách quan, nghiêm túc như giám khảo thật.
CHỈ trả lời bằng JSON hợp lệ, không markdown, không chữ nào khác. KHÔNG được chèn ký tự xuống dòng thật bên trong bất kỳ chuỗi (string) nào của JSON — nếu cần ngắt ý hãy dùng dấu chấm hoặc dấu phẩy, không dùng \\n. Giữ toàn bộ phản hồi ngắn gọn (dưới 400 từ).
Cấu trúc: {"score": number, "max_score": 3, "criteria": [{"label": string, "comment": string}], "strengths": [string], "errors": [{"original": string, "corrected": string, "explanation": string}], "overall_feedback": string, "improved_version": string}
Ràng buộc độ dài: mỗi "comment" và "explanation" tối đa 12 từ; "overall_feedback" tối đa 25 từ; "improved_version" tối đa 30 từ; tối đa 2 mục trong "criteria", tối đa 2 mục trong "errors", tối đa 2 mục trong "strengths". Toàn bộ text tiếng Việt, trừ cụm tiếng Anh trích từ bài làm.
QUAN TRỌNG VỀ TỪ VỰNG: thí sinh có trình độ trung cấp (khoảng 700 điểm TOEIC), vốn từ chưa phong phú. Trong "corrected" và "improved_version", CHỈ sửa lỗi thực sự sai (ngữ pháp, dùng từ sai) bằng từ vựng đơn giản, thông dụng, cấu trúc câu cơ bản — không thay bằng từ học thuật, hiếm gặp, hay cách diễn đạt hoa mỹ hơn mức cần thiết. Giữ nguyên văn phong và các từ đúng mà thí sinh đã dùng.`;

const SYS_PART2 = `Bạn là giám khảo chính thức chấm bài thi TOEIC Writing, phần "Trả lời yêu cầu bằng văn bản" (Question 6-7, viết email). Thang điểm 0-4:
- 4: đáp ứng đầy đủ mọi yêu cầu đề bài, tổ chức rõ ràng mạch lạc, ngữ pháp/từ vựng chính xác, lỗi (nếu có) rất nhỏ.
- 3: đáp ứng phần lớn yêu cầu, tổ chức khá tốt, có vài lỗi nhỏ không sai nghĩa.
- 2: thiếu yêu cầu quan trọng, hoặc có lỗi khiến khó hiểu ở một số chỗ.
- 1: đáp ứng rất ít nội dung liên quan, hoặc quá nhiều lỗi khiến khó hiểu.
- 0: bỏ trắng, không liên quan, không phải tiếng Anh, hoặc chép đề.
Kiểm tra kỹ thí sinh có trả lời đủ TẤT CẢ yêu cầu trong đề không, rồi mới chấm ngữ pháp/tổ chức.
CHỈ trả lời bằng JSON hợp lệ, không markdown, không chữ nào khác. KHÔNG chèn ký tự xuống dòng thật bên trong chuỗi JSON — dùng dấu chấm/phẩy thay thế, không dùng \\n. Giữ phản hồi ngắn gọn (dưới 450 từ).
Cấu trúc: {"score": number, "max_score": 4, "criteria": [{"label": string, "comment": string}], "strengths": [string], "errors": [{"original": string, "corrected": string, "explanation": string}], "overall_feedback": string, "improved_version": string}
Ràng buộc độ dài: mỗi "comment"/"explanation" tối đa 12 từ; "overall_feedback" tối đa 25 từ; "improved_version" tối đa 35 từ; đúng 2 mục "criteria" (đáp ứng yêu cầu / ngữ pháp-tổ chức); tối đa 3 mục "errors"; tối đa 2 mục "strengths". Toàn bộ text tiếng Việt, trừ cụm tiếng Anh trích dẫn.
QUAN TRỌNG VỀ TỪ VỰNG: thí sinh có trình độ trung cấp (khoảng 700 điểm TOEIC), vốn từ chưa phong phú. Trong "corrected" và "improved_version", CHỈ sửa lỗi thực sự sai (ngữ pháp, dùng từ sai, thiếu ý theo yêu cầu đề) bằng từ vựng đơn giản, thông dụng, cấu trúc câu cơ bản — không thay bằng từ học thuật, hiếm gặp, hay cách diễn đạt hoa mỹ hơn mức cần thiết. Giữ nguyên văn phong và các từ đúng mà thí sinh đã dùng.`;

const SYS_PART3 = `Bạn là giám khảo chính thức chấm bài thi TOEIC Writing, phần "Bài luận nêu ý kiến" (Question 8). Thang điểm 0-5:
- 5: tổ chức/phát triển ý tốt, ví dụ/lý do cụ thể phù hợp, mạch lạc, đa dạng từ vựng-cấu trúc câu, lỗi nếu có rất nhỏ.
- 4: khá tốt nhưng chưa thật đầy đủ, đôi chỗ thiếu mạch lạc, một số lỗi không nghiêm trọng.
- 3: đủ nhưng lập luận mơ hồ/hạn chế, mạch lạc không nhất quán, từ vựng-cấu trúc hạn chế, lỗi đôi chỗ gây khó hiểu.
- 2: tổ chức/phát triển yếu, lập luận thiếu thuyết phục, mạch lạc kém, từ vựng nghèo, lỗi gây khó hiểu.
- 1: không rõ tổ chức/phát triển, không có lập luận phù hợp, lỗi nghiêm trọng thường xuyên.
- 0: bỏ trắng, lạc đề, không phải tiếng Anh, hoặc chép đề.
Đánh giá 4 khía cạnh: lập luận & ví dụ, tổ chức/mạch lạc, đa dạng từ vựng-câu, độ chính xác ngữ pháp. Nếu bài dưới 300 từ, đây là một điểm trừ cần nêu rõ trong "overall_feedback".
CHỈ trả lời bằng JSON hợp lệ, không markdown, không chữ nào khác. KHÔNG chèn ký tự xuống dòng thật bên trong chuỗi JSON — dùng dấu chấm/phẩy thay thế, không dùng \\n. Giữ phản hồi ngắn gọn (dưới 500 từ) dù bài luận dài.
Cấu trúc: {"score": number, "max_score": 5, "criteria": [{"label": string, "comment": string}], "strengths": [string], "errors": [{"original": string, "corrected": string, "explanation": string}], "overall_feedback": string, "improved_version": string}
Ràng buộc độ dài: đúng 4 mục "criteria" (mỗi "comment" tối đa 12 từ); tối đa 3 mục "errors" (mỗi "explanation" tối đa 12 từ); tối đa 2 mục "strengths"; "overall_feedback" tối đa 30 từ; "improved_version" chỉ viết lại 1 câu/đoạn ngắn tiêu biểu, tối đa 40 từ. Toàn bộ text tiếng Việt, trừ cụm tiếng Anh trích dẫn.
QUAN TRỌNG VỀ TỪ VỰNG: thí sinh có trình độ trung cấp (khoảng 700 điểm TOEIC), vốn từ chưa phong phú. Trong "corrected" và "improved_version", CHỈ sửa lỗi thực sự sai (ngữ pháp, dùng từ sai, lập luận chưa rõ) bằng từ vựng đơn giản, thông dụng, cấu trúc câu cơ bản đến trung cấp — không thay bằng từ học thuật, hiếm gặp, hay cách diễn đạt hoa mỹ hơn mức cần thiết. Giữ nguyên văn phong và các từ đúng mà thí sinh đã dùng, chỉ nâng cấp vừa đủ để câu đúng và rõ nghĩa.`;

const SYSTEMS = { part1: SYS_PART1, part2: SYS_PART2, part3: SYS_PART3 };

/* =========================================================
   UTILITIES
========================================================= */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function countWords(str) {
  const t = (str || "").trim();
  return t ? t.split(/\s+/).length : 0;
}
function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("vi-VN") + " " + d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function resizeImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 900;
        let { width, height } = img;
        if (width > height && width > maxDim) { height = Math.round(height * (maxDim / width)); width = maxDim; }
        else if (height > maxDim) { width = Math.round(width * (maxDim / height)); height = maxDim; }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
        resolve({ mediaType: "image/jpeg", base64: dataUrl.split(",")[1], dataUrl });
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
function svgToImagePayload(svgString) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL("image/png");
      resolve({ mediaType: "image/png", base64: dataUrl.split(",")[1], dataUrl });
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgString)));
  });
}
function person(x, y, skin, shirt) {
  return `<circle cx="${x}" cy="${y}" r="11" fill="${skin}"/><rect x="${x - 13}" y="${y + 11}" width="26" height="38" rx="6" fill="${shirt}"/>`;
}
function scene(bg, shapes) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320"><rect width="480" height="320" fill="${bg}"/>${shapes}</svg>`;
}
const SCENE_SVGS = {
  bank: scene("#EAF2F8", `<rect x="60" y="60" width="360" height="170" fill="#F4EFE4" stroke="#8B7A5E" stroke-width="4"/><rect x="140" y="78" width="200" height="16" fill="#3B4A5A"/><text x="240" y="91" font-family="Arial" font-size="12" fill="#fff" text-anchor="middle" font-weight="bold">BANK</text><rect x="210" y="110" width="60" height="80" fill="#B8CBD9"/>${person(240,130,"#E8B98A","#5A7D93")}${person(120,180,"#E8B98A","#C4694F")}${person(160,185,"#D69B78","#4E7C6A")}${person(200,182,"#E8B98A","#8A6BA8")}`),
  meeting: scene("#F3EFE6", `<rect x="80" y="150" width="320" height="18" fill="#8B7355"/><rect x="180" y="60" width="40" height="30" fill="#3B4A5A"/>${person(150,140,"#E8B98A","#4E7C6A")}${person(240,140,"#D69B78","#8A6BA8")}${person(320,140,"#E8B98A","#C4694F")}`),
  menu: scene("#FBEDE3", `<circle cx="240" cy="170" r="70" fill="#D9BFA0"/><rect x="215" y="150" width="50" height="34" fill="#fff" stroke="#999"/>${person(160,150,"#E8B98A","#4E7C6A")}${person(320,150,"#D69B78","#8A6BA8")}`),
  luggage: scene("#E7F0EA", `<rect x="180" y="190" width="70" height="50" rx="6" fill="#5A7D93"/><circle cx="195" cy="245" r="7" fill="#333"/><circle cx="235" cy="245" r="7" fill="#333"/><circle cx="330" cy="90" r="26" fill="#fff" stroke="#333" stroke-width="2"/><line x1="330" y1="90" x2="330" y2="74" stroke="#333" stroke-width="2"/><line x1="330" y1="90" x2="342" y2="94" stroke="#333" stroke-width="2"/>${person(270,180,"#E8B98A","#C4694F")}`),
  park: scene("#E9F5E1", `<polygon points="100,120 130,180 70,180" fill="#6B8E5A"/><rect x="94" y="180" width="12" height="30" fill="#7A5A3A"/><polygon points="340,100 375,170 305,170" fill="#5E9C5A"/><rect x="333" y="170" width="14" height="34" fill="#7A5A3A"/><rect x="180" y="220" width="120" height="14" fill="#8B7355"/>${person(200,205,"#E8B98A","#4E7C6A")}${person(260,205,"#D69B78","#C4694F")}`)
};

/* JSON repair: fixes literal newlines inside JSON string values, a common
   cause of "Unterminated string" errors when the model breaks lines mid-field. */
function repairAndParseJSON(text) {
  try { return JSON.parse(text); } catch (e) { /* fall through to repair */ }
  let repaired = "";
  let inStr = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"' && text[i - 1] !== "\\") inStr = !inStr;
    if (inStr && (ch === "\n" || ch === "\r")) repaired += "\\n";
    else repaired += ch;
  }
  return JSON.parse(repaired);
}

async function callClaudeRaw(system, content) {
  const response = await fetch("/api/grade", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, content })
  });
  if (!response.ok) {
    let detail = "";
    try { const errBody = await response.json(); detail = errBody.error || ""; } catch {}
    throw new Error(`Lỗi gọi API (${response.status})${detail ? ": " + detail : ""}`);
  }
  const data = await response.json();
  const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
  return text.replace(/```json|```/g, "").trim();
}
async function callClaudeWithRetry(system, content, attempt = 1) {
  const raw = await callClaudeRaw(system, content); // let network/API errors bubble up immediately, no point retrying those
  try {
    return repairAndParseJSON(raw);
  } catch (e) {
    if (attempt < 2) return callClaudeWithRetry(system, content, attempt + 1);
    throw new Error("Không đọc được kết quả chấm điểm sau nhiều lần thử (phản hồi không đúng định dạng JSON).");
  }
}
async function gradeQuestion(partKey, promptData, answerText) {
  const system = SYSTEMS[partKey];
  let content;
  if (partKey === "part1") {
    content = [
      { type: "image", source: { type: "base64", media_type: promptData.image.mediaType, data: promptData.image.base64 } },
      { type: "text", text: `Hai từ/cụm từ bắt buộc: "${promptData.word1}" và "${promptData.word2}"\n\nCâu trả lời của thí sinh: "${answerText}"` }
    ];
  } else {
    content = [{ type: "text", text: `Đề bài:\n"""${promptData.prompt}"""\n\nBài làm của thí sinh:\n"""${answerText}"""` }];
  }
  return await callClaudeWithRetry(system, content);
}

/* =========================================================
   STORAGE HELPERS — backed by /api/storage (Vercel Blob on the server).
   Everyone who opens this app shares the same data (2-user setup).

   IMPORTANT: storageGet throws on a real read failure instead of returning
   null/[]. Returning null on failure used to be indistinguishable from
   "no data saved yet", which caused the app to think a brand-new/redeployed
   instance had zero tests and silently reseed + overwrite the real index —
   wiping out previously created tests and history. Now a failed read
   surfaces as an error so the bootstrap logic (below) can refuse to touch
   storage until it succeeds, instead of guessing.
========================================================= */
async function storageGet(key) {
  const res = await fetch("/api/storage?key=" + encodeURIComponent(key));
  if (!res.ok) {
    let detail = "";
    try { const errBody = await res.json(); detail = errBody.error || ""; } catch {}
    throw new Error(`Không đọc được dữ liệu (${res.status})${detail ? ": " + detail : ""}`);
  }
  const data = await res.json();
  return data.value ?? null;
}
async function storageSet(key, value) {
  await fetch("/api/storage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value })
  });
}
async function storageDelete(key) {
  await fetch("/api/storage?key=" + encodeURIComponent(key), { method: "DELETE" });
}

async function loadTestsIndex() {
  const v = await storageGet("tests-index");
  return v || [];
}
async function saveTestsIndex(index) { await storageSet("tests-index", index); }
async function loadTest(id) { return await storageGet("test:" + id); }
async function saveTest(test) { await storageSet("test:" + test.id, test); }
async function deleteTestStorage(id) { await storageDelete("test:" + id); }
async function loadHistory() {
  const v = await storageGet("history");
  return v || [];
}
async function saveHistory(history) { await storageSet("history", history); }

async function buildSeedTest() {
  const imgs = await Promise.all([
    svgToImagePayload(SCENE_SVGS.bank),
    svgToImagePayload(SCENE_SVGS.meeting),
    svgToImagePayload(SCENE_SVGS.menu),
    svgToImagePayload(SCENE_SVGS.luggage),
    svgToImagePayload(SCENE_SVGS.park)
  ]);
  const part1 = [
    { id: uid(), image: imgs[0], word1: "line", word2: "bank" },
    { id: uid(), image: imgs[1], word1: "although", word2: "meeting" },
    { id: uid(), image: imgs[2], word1: "instead of", word2: "menu" },
    { id: uid(), image: imgs[3], word1: "in order to", word2: "luggage" },
    { id: uid(), image: imgs[4], word1: "while", word2: "park" }
  ];
  const part2 = [
    {
      id: uid(),
      prompt: `Subject: Late Delivery of My Order

Dear Customer Service,

I ordered a laptop from your website two weeks ago, and it still hasn't arrived. The tracking page hasn't been updated in five days. I need this laptop for work, and this delay is causing serious problems for me. Please explain what happened and let me know what you can do to fix this.

Regards,
David Chen

(Yêu cầu: viết email trả lời đáp ứng đủ 3 việc — 1) xin lỗi khách hàng, 2) giải thích lý do chậm trễ, 3) đề xuất một hình thức bồi thường.)`
    },
    {
      id: uid(),
      prompt: `Subject: Request to Reschedule Team Meeting

Hi,

I have a doctor's appointment on Thursday afternoon at 2 PM, which conflicts with our weekly team meeting. Could we move the meeting to Friday morning instead? If that doesn't work, I'm also available Thursday morning before 11 AM. Please let me know which option works best for the team.

Thanks,
Minh

(Yêu cầu: xác nhận 1 trong 2 lựa chọn thời gian, cho biết sẽ báo các thành viên khác, và hỏi có cần chuẩn bị tài liệu gì thêm không.)`
    }
  ];
  const part3 = [{
    id: uid(),
    prompt: `Some people believe that employees should be allowed to work from home permanently. Others believe employees should return to the office full-time. Which do you think is better? Use specific reasons and examples to support your opinion.`
  }];

  return { id: uid(), name: "Đề mẫu 01 — Luyện tập TOEIC Writing", createdAt: Date.now(), part1, part2, part3 };
}

/* =========================================================
   SMALL UI PIECES
========================================================= */
function ScoreRing({ score, max, size = 76 }) {
  const pct = Math.max(0, Math.min(1, max ? score / max : 0));
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E7EB" strokeWidth="7" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#0d9488" strokeWidth="7"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          style={{ transition: "stroke-dashoffset .6s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-extrabold text-slate-900" style={{ fontSize: size * 0.26 }}>{score}</span>
        <span className="text-slate-400" style={{ fontSize: size * 0.13 }}>/ {max}</span>
      </div>
    </div>
  );
}

function QuestionResultCard({ q, promptData, onRegrade, regrading }) {
  const g = q.graded;
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Câu {q.globalNum}</span>
        {g && !g.error && <span className="text-sm font-bold text-teal-700">{g.score}/{g.max_score}</span>}
      </div>

      {promptData && (
        <div className="mb-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Đề bài</p>
          {q.partKey === "part1" ? (
            <div className="flex gap-3 items-start">
              <img src={promptData.image.dataUrl} alt="đề bài" className="w-28 rounded-lg border border-slate-200 flex-shrink-0" />
              <p className="text-xs text-slate-500 pt-1">Từ bắt buộc: <b>{promptData.word1}</b> · <b>{promptData.word2}</b></p>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 whitespace-pre-wrap max-h-40 overflow-y-auto">{promptData.prompt}</div>
          )}
        </div>
      )}

      {q.answer && (
        <div className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Bài làm</p>
          <div className="bg-teal-50/40 border border-teal-100 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap">{q.answer}</div>
        </div>
      )}

      {!g && <p className="text-sm text-slate-400 italic">Bỏ trắng — 0 điểm.</p>}
      {g && g.error && (
        <div className="flex items-center justify-between gap-3 bg-rose-50 rounded-lg p-3">
          <div>
            <span className="text-sm text-rose-700 block">Không chấm được câu này.</span>
            {g.message && <span className="text-xs text-rose-500 block mt-0.5">{g.message}</span>}
          </div>
          <button onClick={onRegrade} disabled={regrading}
            className="flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-100 hover:bg-rose-200 px-3 py-1.5 rounded-full disabled:opacity-50 flex-shrink-0">
            <RotateCcw size={12} /> {regrading ? "Đang chấm..." : "Chấm lại"}
          </button>
        </div>
      )}
      {g && !g.error && (
        <>
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Nhận xét</p>
          <p className="text-sm text-slate-700 mb-3">{g.overall_feedback}</p>
          <div className="grid gap-2 mb-3">
            {(g.criteria || []).map((c, i) => (
              <div key={i} className="flex gap-2 text-xs bg-slate-50 rounded-lg px-3 py-2">
                <span className="font-bold text-slate-500 flex-shrink-0">{c.label}:</span>
                <span className="text-slate-600">{c.comment}</span>
              </div>
            ))}
          </div>
          {(g.errors || []).length > 0 && (
            <div className="grid gap-2 mb-2">
              {g.errors.map((e, i) => (
                <div key={i} className="bg-rose-50 rounded-lg px-3 py-2 text-xs">
                  <span className="line-through text-rose-500">{e.original}</span>
                  <span className="mx-1 text-slate-400">→</span>
                  <span className="font-semibold text-teal-700">{e.corrected}</span>
                  <div className="text-slate-500 mt-0.5">{e.explanation}</div>
                </div>
              ))}
            </div>
          )}
          {g.improved_version && (
            <div className="bg-teal-50 rounded-lg px-3 py-2 text-xs text-teal-800 mt-2">{g.improved_version}</div>
          )}
        </>
      )}
    </div>
  );
}

function ImageInputBox({ value, onChange }) {
  const fileRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const process = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const payload = await resizeImageFile(file);
    onChange(payload);
  };
  return (
    <div
      tabIndex={0}
      onClick={() => fileRef.current && fileRef.current.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files[0]) process(e.dataTransfer.files[0]); }}
      onPaste={(e) => {
        const items = e.clipboardData && e.clipboardData.items;
        if (!items) return;
        for (const item of items) {
          if (item.type.startsWith("image/")) { process(item.getAsFile()); break; }
        }
      }}
      className={`relative rounded-xl border-2 border-dashed cursor-pointer flex items-center justify-center text-center text-xs p-3 min-h-[130px] outline-none ${drag ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-300 bg-slate-50 text-slate-400"}`}
    >
      <input ref={fileRef} type="file" accept="image/*" hidden
        onChange={(e) => e.target.files[0] && process(e.target.files[0])} />
      {value ? (
        <>
          <img src={value.dataUrl} alt="preview" className="max-h-32 rounded-lg" />
          <button onClick={(e) => { e.stopPropagation(); onChange(null); }}
            className="absolute top-1 right-1 bg-white/90 rounded-full p-1 shadow"><X size={13} /></button>
        </>
      ) : (
        <div>
          <ImageIcon size={20} className="mx-auto mb-1" />
          Bấm để tải ảnh, kéo-thả, hoặc dán (Ctrl+V) từ clipboard
        </div>
      )}
    </div>
  );
}

/* =========================================================
   VIEWS
========================================================= */
function LibraryView({ tests, onOpenEditor, onSelectTest, onGoHistory, onDeleteTest }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight">Đề thi của bạn</h1>
        <div className="flex gap-2">
          <button onClick={onGoHistory} className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 px-4 py-2 rounded-full hover:bg-slate-50">
            <History size={15} /> Lịch sử
          </button>
          <button onClick={onOpenEditor} className="flex items-center gap-1.5 text-sm font-semibold text-white bg-teal-600 px-4 py-2 rounded-full hover:bg-teal-700">
            <Plus size={15} /> Tạo đề mới
          </button>
        </div>
      </div>
      {tests.length === 0 && <p className="text-slate-400 text-sm">Chưa có đề nào. Hãy tạo một đề mới.</p>}
      <div className="grid gap-3">
        {tests.map(t => (
          <div key={t.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between hover:border-teal-300 transition">
            <button className="text-left flex-1" onClick={() => onSelectTest(t.id)}>
              <div className="font-bold text-slate-900">{t.name}</div>
              <div className="text-xs text-slate-400 mt-1">8 câu · tạo ngày {formatDate(t.createdAt)}</div>
            </button>
            <button onClick={() => onDeleteTest(t.id)} className="text-slate-300 hover:text-rose-500 p-2"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function EditorView({ onCancel, onSave }) {
  const [name, setName] = useState("");
  const [part1, setPart1] = useState(Array.from({ length: 5 }, () => ({ id: uid(), image: null, word1: "", word2: "" })));
  const [part2, setPart2] = useState(Array.from({ length: 2 }, () => ({ id: uid(), prompt: "" })));
  const [part3, setPart3] = useState([{ id: uid(), prompt: "" }]);
  const [error, setError] = useState("");

  const updateP1 = (i, patch) => setPart1(arr => arr.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const updateP2 = (i, patch) => setPart2(arr => arr.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const updateP3 = (patch) => setPart3([{ ...part3[0], ...patch }]);

  const handleSave = () => {
    if (!name.trim()) return setError("Vui lòng đặt tên cho đề.");
    if (part1.some(q => !q.image || !q.word1.trim() || !q.word2.trim())) return setError("Mỗi câu Phần 1 cần có ảnh và đủ 2 từ bắt buộc.");
    if (part2.some(q => !q.prompt.trim())) return setError("Mỗi câu Phần 2 cần có đề bài (email yêu cầu).");
    if (!part3[0].prompt.trim()) return setError("Phần 3 cần có đề luận.");
    setError("");
    onSave({ id: uid(), name: name.trim(), createdAt: Date.now(), part1, part2, part3 });
  };

  return (
    <div>
      <button onClick={onCancel} className="flex items-center gap-1 text-sm text-slate-500 mb-4 hover:text-slate-800"><ChevronLeft size={16} /> Quay lại</button>
      <h1 className="text-2xl font-extrabold tracking-tight mb-1">Tạo đề mới</h1>
      <p className="text-sm text-slate-400 mb-5">Một đề Writing gồm đúng 8 câu: 5 câu mô tả tranh, 2 câu email, 1 bài luận.</p>

      <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Tên đề</label>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="VD: Đề luyện tập số 2"
        className="w-full mt-1 mb-6 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-500" />

      <h2 className="font-bold text-slate-800 mb-3">Phần 1 · Mô tả tranh (5 câu)</h2>
      <div className="grid gap-4 mb-8">
        {part1.map((q, i) => (
          <div key={q.id} className="bg-white border border-slate-200 rounded-2xl p-4 grid md:grid-cols-2 gap-4">
            <ImageInputBox value={q.image} onChange={(img) => updateP1(i, { image: img })} />
            <div className="grid gap-2">
              <span className="text-xs font-bold text-slate-400">Câu {i + 1}</span>
              <input value={q.word1} onChange={e => updateP1(i, { word1: e.target.value })} placeholder="Từ bắt buộc #1"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200" />
              <input value={q.word2} onChange={e => updateP1(i, { word2: e.target.value })} placeholder="Từ bắt buộc #2"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200" />
            </div>
          </div>
        ))}
      </div>

      <h2 className="font-bold text-slate-800 mb-3">Phần 2 · Trả lời email (2 câu)</h2>
      <div className="grid gap-4 mb-8">
        {part2.map((q, i) => (
          <div key={q.id} className="bg-white border border-slate-200 rounded-2xl p-4">
            <span className="text-xs font-bold text-slate-400">Câu {6 + i}</span>
            <textarea value={q.prompt} onChange={e => updateP2(i, { prompt: e.target.value })}
              placeholder="Dán nội dung email đề bài + các yêu cầu cần phản hồi" rows={5}
              className="w-full mt-2 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200" />
          </div>
        ))}
      </div>

      <h2 className="font-bold text-slate-800 mb-3">Phần 3 · Bài luận (1 câu)</h2>
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-8">
        <span className="text-xs font-bold text-slate-400">Câu 8</span>
        <textarea value={part3[0].prompt} onChange={e => updateP3({ prompt: e.target.value })}
          placeholder="Dán đề luận (opinion essay prompt)" rows={4}
          className="w-full mt-2 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200" />
      </div>

      {error && <p className="text-sm text-rose-600 mb-3">{error}</p>}
      <button onClick={handleSave} className="block mx-auto bg-teal-600 hover:bg-teal-700 text-white font-bold px-8 py-3 rounded-full">Lưu đề</button>
    </div>
  );
}

function SetupView({ test, onBack, onStart }) {
  const [mode, setMode] = useState("full");
  const [parts, setParts] = useState({ part1: true, part2: true, part3: true });
  const [times, setTimes] = useState({ ...PART_DEFAULT_MIN });

  const togglePart = (k) => setParts(p => ({ ...p, [k]: !p[k] }));
  const selected = mode === "full" ? { part1: true, part2: true, part3: true } : parts;
  const anySelected = Object.values(selected).some(Boolean);

  return (
    <div className="max-w-xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500 mb-4 hover:text-slate-800"><ChevronLeft size={16} /> Quay lại</button>
      <h1 className="text-2xl font-extrabold tracking-tight mb-1">{test.name}</h1>
      <p className="text-sm text-slate-400 mb-6">Chọn phạm vi và thời gian làm bài trước khi bắt đầu.</p>

      <div className="flex gap-2 mb-5">
        <button onClick={() => setMode("full")} className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold ${mode === "full" ? "bg-teal-600 text-white border-teal-600" : "bg-white border-slate-200 text-slate-600"}`}>Làm full bài (8 câu)</button>
        <button onClick={() => setMode("partial")} className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold ${mode === "partial" ? "bg-teal-600 text-white border-teal-600" : "bg-white border-slate-200 text-slate-600"}`}>Chọn từng phần</button>
      </div>

      {mode === "partial" && (
        <div className="grid gap-2 mb-5">
          {["part1", "part2", "part3"].map(k => (
            <label key={k} className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer ${parts[k] ? "border-teal-400 bg-teal-50" : "border-slate-200 bg-white"}`}>
              <input type="checkbox" checked={parts[k]} onChange={() => togglePart(k)} className="w-4 h-4 accent-teal-600" />
              <span className="text-sm font-semibold text-slate-700">{PART_TITLES[k]} · {PART_SUBTITLES[k]}</span>
            </label>
          ))}
        </div>
      )}

      <div className="grid gap-3 mb-8">
        {["part1", "part2", "part3"].filter(k => selected[k]).map(k => (
          <div key={k} className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3">
            <span className="text-sm text-slate-600">{PART_TITLES[k]} — thời gian (phút)</span>
            <input type="number" min={1} value={times[k]} onChange={e => setTimes(t => ({ ...t, [k]: Math.max(1, parseInt(e.target.value) || 1) }))}
              className="w-16 text-center border border-slate-200 rounded-lg py-1.5 text-sm" />
          </div>
        ))}
      </div>

      <button
        disabled={!anySelected}
        onClick={() => onStart({ mode, parts: selected, times })}
        className="flex items-center gap-2 justify-center w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-bold px-8 py-3.5 rounded-full">
        <Clock size={17} /> Bắt đầu làm bài
      </button>
    </div>
  );
}

function TakingView({ test, config, onSubmit }) {
  const totalSec = ["part1", "part2", "part3"].filter(k => config.parts[k]).reduce((s, k) => s + config.times[k] * 60, 0);
  const [timeLeft, setTimeLeft] = useState(totalSec);
  const [answers, setAnswers] = useState({});
  const submittedRef = useRef(false);

  useEffect(() => {
    const iv = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(iv); if (!submittedRef.current) { submittedRef.current = true; onSubmit(answers, true); } return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setAnswer = (id, val) => setAnswers(a => ({ ...a, [id]: val }));

  const handleSubmitClick = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    onSubmit(answers, false);
  };

  const questions = [];
  ["part1", "part2", "part3"].forEach(partKey => {
    if (!config.parts[partKey]) return;
    test[partKey].forEach((q, idx) => questions.push({ partKey, q, globalNum: START_NUM[partKey] + idx }));
  });

  const low = timeLeft <= 60;

  return (
    <div className="pb-24">
      <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur border-b border-slate-200 -mx-4 px-4 sm:-mx-6 sm:px-6 py-3 flex items-center justify-between mb-6">
        <span className="font-bold text-slate-800 truncate">{test.name}</span>
        <span className={`flex items-center gap-1.5 font-mono font-bold text-sm px-3 py-1.5 rounded-full ${low ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"}`}>
          <Clock size={14} /> {formatTime(timeLeft)}
        </span>
      </div>

      <div className="grid gap-5">
        {questions.map(({ partKey, q, globalNum }) => {
          const val = answers[q.id] || "";
          const wc = countWords(val);
          const isEssay = partKey === "part3";
          return (
            <div key={q.id} className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Câu {globalNum} · {PART_TITLES[partKey]}</span>
              </div>

              {partKey === "part1" ? (
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <img src={q.image.dataUrl} alt="đề bài" className="w-full rounded-xl border border-slate-200" />
                    <p className="text-xs text-slate-500 mt-2">Từ bắt buộc: <b>{q.word1}</b> · <b>{q.word2}</b></p>
                  </div>
                  <textarea value={val} onChange={e => setAnswer(q.id, e.target.value)} rows={4}
                    placeholder="Viết câu trả lời của bạn..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200" />
                </div>
              ) : (
                <>
                  <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 whitespace-pre-wrap mb-3 max-h-56 overflow-y-auto">{q.prompt}</div>
                  <textarea value={val} onChange={e => setAnswer(q.id, e.target.value)} rows={isEssay ? 12 : 7}
                    placeholder="Viết câu trả lời của bạn..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-200" />
                </>
              )}

              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">{wc} từ</span>
                {isEssay && wc > 0 && wc < ESSAY_MIN_WORDS && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
                    <AlertTriangle size={12} /> Nên viết tối thiểu {ESSAY_MIN_WORDS} từ
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 flex justify-center z-20">
        <button onClick={handleSubmitClick} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold px-8 py-3 rounded-full">
          <Send size={16} /> Nộp bài
        </button>
      </div>
    </div>
  );
}

function ResultsView({ testName, mode, perQuestion, totals, test, onHome, onRegrade, regradingId }) {
  const byPart = { part1: [], part2: [], part3: [] };
  perQuestion.forEach(q => byPart[q.partKey].push(q));
  const findPrompt = (q) => {
    if (!test || !test[q.partKey]) return null;
    return test[q.partKey].find(x => x.id === q.id) || null;
  };
  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight mb-1">Kết quả — {testName}</h1>
      <p className="text-sm text-slate-400 mb-6">{mode === "full" ? "Làm full bài" : "Làm theo phần"}</p>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-5 mb-7">
        <ScoreRing score={totals.grand.score} max={totals.grand.max} size={90} />
        <div className="grid grid-cols-3 gap-4 flex-1">
          {["part1", "part2", "part3"].filter(k => totals[k].max > 0).map(k => (
            <div key={k}>
              <div className="text-xs text-slate-400 font-semibold">{PART_TITLES[k]}</div>
              <div className="font-bold text-slate-800">{totals[k].score}/{totals[k].max}</div>
            </div>
          ))}
        </div>
      </div>

      {!test && (
        <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-5">Không tìm thấy dữ liệu đề gốc để hiển thị lại — có thể đề đã bị xoá. Vẫn hiển thị đầy đủ bài làm và nhận xét bên dưới.</p>
      )}

      {["part1", "part2", "part3"].filter(k => byPart[k].length > 0).map(k => (
        <div key={k} className="mb-7">
          <h2 className="font-bold text-slate-800 mb-3">{PART_TITLES[k]}</h2>
          <div className="grid gap-3">
            {byPart[k].map(q => (
              <QuestionResultCard key={q.id} q={q} promptData={findPrompt(q)} onRegrade={() => onRegrade(q.id)} regrading={regradingId === q.id} />
            ))}
          </div>
        </div>
      ))}

      <button onClick={onHome} className="block mx-auto mt-4 bg-slate-800 hover:bg-slate-900 text-white font-bold px-8 py-3 rounded-full">Về trang chủ</button>
    </div>
  );
}

function HistoryView({ history, onBack, onDelete, onView }) {
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-slate-500 mb-4 hover:text-slate-800"><ChevronLeft size={16} /> Quay lại</button>
      <h1 className="text-2xl font-extrabold tracking-tight mb-5">Lịch sử làm bài</h1>
      {history.length === 0 && <p className="text-slate-400 text-sm">Chưa có lần làm bài nào.</p>}
      <div className="grid gap-3">
        {history.slice().reverse().map(h => (
          <div key={h.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between">
            <button className="text-left flex-1" onClick={() => onView(h)}>
              <div className="font-bold text-slate-900">{h.testName}</div>
              <div className="text-xs text-slate-400 mt-1">{formatDate(h.date)} · {h.mode === "full" ? "Full bài" : "Theo phần"}</div>
            </button>
            <div className="flex items-center gap-3">
              <span className="font-bold text-teal-700">{h.totals.grand.score}/{h.totals.grand.max}</span>
              <button onClick={() => onDelete(h.id)} className="text-slate-300 hover:text-rose-500 p-2"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   MAIN APP
========================================================= */
export default function ToeicApp() {
  const [view, setView] = useState("loading");
  const [testsIndex, setTestsIndex] = useState([]);
  const [testsCache, setTestsCache] = useState({}); // id -> full test object, in-memory source of truth
  const [activeTest, setActiveTest] = useState(null);
  const [testConfig, setTestConfig] = useState(null);
  const [history, setHistory] = useState([]);
  const [resultData, setResultData] = useState(null);
  const [resultTest, setResultTest] = useState(null);
  const [gradingProgress, setGradingProgress] = useState("");
  const [regradingId, setRegradingId] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [bootError, setBootError] = useState("");

  const bootstrap = useCallback(async () => {
    setView("loading");
    setBootError("");
    try {
      const idx = await loadTestsIndex();
      const hist = await loadHistory();

      if (idx.length === 0) {
        // Only seed the demo test the very first time this storage is genuinely
        // empty (confirmed by a successful read) — never as a fallback for a
        // failed read, since that would overwrite any real saved data.
        const seed = await buildSeedTest();
        const newIdx = [{ id: seed.id, name: seed.name, createdAt: seed.createdAt }];
        setTestsCache({ [seed.id]: seed });
        setTestsIndex(newIdx);
        saveTest(seed);
        saveTestsIndex(newIdx);
      } else {
        setTestsIndex(idx);
      }
      setHistory(hist);
      setView("library");
    } catch (e) {
      // A failed read must NOT be treated as "no data yet" — surface it and
      // let the user retry, rather than silently reseeding over real data.
      setBootError(e.message || "Không kết nối được tới nơi lưu trữ dữ liệu.");
      setView("bootError");
    }
  }, []);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  const goLibrary = () => { setActiveTest(null); setResultData(null); setResultTest(null); setView("library"); };

  const handleOpenEditor = () => setView("editor");
  const handleSaveTest = async (test) => {
    setTestsCache(c => ({ ...c, [test.id]: test })); // available immediately, no storage round-trip needed
    const idx = [...testsIndex, { id: test.id, name: test.name, createdAt: test.createdAt }];
    setTestsIndex(idx);
    saveTest(test);
    saveTestsIndex(idx);
    goLibrary();
  };
  const handleDeleteTest = async (id) => {
    const idx = testsIndex.filter(t => t.id !== id);
    setTestsIndex(idx);
    setTestsCache(c => { const n = { ...c }; delete n[id]; return n; });
    saveTestsIndex(idx);
    deleteTestStorage(id);
  };
  const handleSelectTest = async (id) => {
    setLoadError("");
    if (testsCache[id]) { setActiveTest(testsCache[id]); setView("setup"); return; }
    const t = await loadTest(id);
    if (t) {
      setTestsCache(c => ({ ...c, [id]: t }));
      setActiveTest(t);
      setView("setup");
    } else {
      setLoadError("Không tải được đề này. Có thể dữ liệu đã bị mất — hãy thử tạo lại đề.");
    }
  };

  const handleStartTest = (config) => { setTestConfig(config); setView("taking"); };

  const handleSubmitTest = async (answers, auto) => {
    setView("grading");
    const questions = [];
    ["part1", "part2", "part3"].forEach(partKey => {
      if (!testConfig.parts[partKey]) return;
      activeTest[partKey].forEach((q, idx) => questions.push({ partKey, q, globalNum: START_NUM[partKey] + idx }));
    });

    const results = [];
    for (let i = 0; i < questions.length; i++) {
      const { partKey, q, globalNum } = questions[i];
      setGradingProgress(`Đang chấm câu ${i + 1}/${questions.length}...`);
      const answerText = (answers[q.id] || "").trim();
      if (!answerText) {
        results.push({ id: q.id, partKey, globalNum, answer: "", graded: null });
        continue;
      }
      try {
        const graded = await gradeQuestion(partKey, q, answerText);
        results.push({ id: q.id, partKey, globalNum, answer: answerText, graded });
      } catch (e) {
        results.push({ id: q.id, partKey, globalNum, answer: answerText, graded: { error: true, message: e.message } });
      }
    }

    const totals = computeTotals(results);
    const entry = {
      id: uid(),
      testId: activeTest.id,
      testName: activeTest.name,
      date: Date.now(),
      mode: testConfig.mode,
      perQuestion: results,
      totals
    };
    const newHistory = [...history, entry];
    setHistory(newHistory);
    await saveHistory(newHistory);
    setResultTest(activeTest);
    setResultData(entry);
    setView("results");
  };

  const handleRegrade = async (questionId) => {
    if (!resultData) return;
    const target = resultData.perQuestion.find(q => q.id === questionId);
    if (!target || !target.answer) return;
    // find the original question payload from activeTest (still in memory) or by re-fetching
    let promptData = null;
    const test = testsCache[resultData.testId] || (activeTest && activeTest.id === resultData.testId ? activeTest : await loadTest(resultData.testId));
    if (test) promptData = test[target.partKey].find(q => q.id === questionId);
    if (!promptData) return;
    setRegradingId(questionId);
    try {
      const graded = await gradeQuestion(target.partKey, promptData, target.answer);
      const updatedPerQuestion = resultData.perQuestion.map(q => q.id === questionId ? { ...q, graded } : q);
      const totals = computeTotals(updatedPerQuestion);
      const updatedEntry = { ...resultData, perQuestion: updatedPerQuestion, totals };
      setResultData(updatedEntry);
      const newHistory = history.map(h => h.id === updatedEntry.id ? updatedEntry : h);
      setHistory(newHistory);
      await saveHistory(newHistory);
    } catch (e) {
      const updatedPerQuestion = resultData.perQuestion.map(q => q.id === questionId ? { ...q, graded: { error: true, message: e.message } } : q);
      const totals = computeTotals(updatedPerQuestion);
      setResultData({ ...resultData, perQuestion: updatedPerQuestion, totals });
    }
    setRegradingId(null);
  };

  const handleDeleteHistory = async (id) => {
    const newHistory = history.filter(h => h.id !== id);
    setHistory(newHistory);
    await saveHistory(newHistory);
  };

  function computeTotals(results) {
    const totals = {
      part1: { score: 0, max: 0 }, part2: { score: 0, max: 0 }, part3: { score: 0, max: 0 },
      grand: { score: 0, max: 0 }
    };
    results.forEach(r => {
      const max = PART_MAX_PER_Q[r.partKey];
      const score = r.graded && !r.graded.error ? (r.graded.score || 0) : 0;
      totals[r.partKey].score += score;
      totals[r.partKey].max += max;
      totals.grand.score += score;
      totals.grand.max += max;
    });
    return totals;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {view === "loading" && <p className="text-center text-slate-400 py-20">Đang tải...</p>}

        {view === "bootError" && (
          <div className="text-center py-20">
            <AlertTriangle className="mx-auto mb-3 text-rose-500" size={32} />
            <p className="text-slate-700 font-semibold mb-1">Không tải được đề đã lưu</p>
            <p className="text-sm text-slate-400 max-w-sm mx-auto mb-5">{bootError}. Đề và lịch sử cũ của bạn vẫn còn nguyên trên storage — chỉ là chưa tải được lúc này, nên ứng dụng sẽ không tạo đề mẫu mới hay ghi đè gì cả cho tới khi bạn thử lại thành công.</p>
            <button onClick={bootstrap} className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-2.5 rounded-full">
              <RotateCcw size={16} /> Thử lại
            </button>
          </div>
        )}

        {view === "library" && (
          <>
            {loadError && (
              <div className="mb-4 bg-rose-50 text-rose-700 text-sm rounded-xl px-4 py-3">{loadError}</div>
            )}
            <LibraryView
              tests={testsIndex}
              onOpenEditor={handleOpenEditor}
              onSelectTest={handleSelectTest}
              onGoHistory={() => setView("history")}
              onDeleteTest={handleDeleteTest}
            />
          </>
        )}

        {view === "editor" && <EditorView onCancel={goLibrary} onSave={handleSaveTest} />}

        {view === "setup" && activeTest && (
          <SetupView test={activeTest} onBack={goLibrary} onStart={handleStartTest} />
        )}

        {view === "taking" && activeTest && testConfig && (
          <TakingView test={activeTest} config={testConfig} onSubmit={handleSubmitTest} />
        )}

        {view === "grading" && (
          <div className="text-center py-24">
            <div className="inline-block w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mb-4" />
            <p className="text-slate-500 text-sm">{gradingProgress || "Đang chấm bài..."}</p>
          </div>
        )}

        {view === "results" && resultData && (
          <ResultsView
            testName={resultData.testName}
            mode={resultData.mode}
            perQuestion={resultData.perQuestion}
            totals={resultData.totals}
            test={resultTest}
            onHome={goLibrary}
            onRegrade={handleRegrade}
            regradingId={regradingId}
          />
        )}

        {view === "history" && (
          <HistoryView
            history={history}
            onBack={goLibrary}
            onDelete={handleDeleteHistory}
            onView={async (h) => {
              const t = testsCache[h.testId] || await loadTest(h.testId);
              if (t) setTestsCache(c => ({ ...c, [h.testId]: t }));
              setResultTest(t || null);
              setResultData(h);
              setView("results");
            }}
          />
        )}
      </div>
    </div>
  );
}
