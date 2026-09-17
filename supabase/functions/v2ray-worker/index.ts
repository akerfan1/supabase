// Cloudflare Worker — Xray dynamic best-ping (every 30s) + Fragment + Beta (finalMask)
// Output: JSON array with three full configs
// Routes:
//   /?uuid=1            -> [ LoadBalance, Irancell (Fragment), Beta (finalMask) ]
//   /?uuid=1&view=sub   -> v2rayN/NG subscription with randomized VLESS IPs


// ============================================================
// Random Proxy IPs
// ============================================================
// هر بار Update زده شود، برای هر VLESS یکی از این IPها
// به صورت تصادفی انتخاب می‌شود.
// خودت بعداً می‌توانی این لیست را تغییر بدهی.
// ============================================================

const PROXY_IPS = [
  "104.25.206.186",
  "154.211.8.195",
  "104.16.102.15",
  "104.19.41.171",
  "104.18.114.234",
  "172.66.44.200",
  "104.20.18.167",
  "172.67.163.166",
  "104.16.154.245",
  "104.16.70.194",
  "104.16.181.106",
  "104.16.132.51",
  "104.16.67.219",
  "104.16.194.147",
  "104.16.66.15",
  "104.16.196.44",
  "104.16.68.102",
  "104.16.111.127"
];

function getRandomProxyIP() {
  return PROXY_IPS[Math.floor(Math.random() * PROXY_IPS.length)];
}


// ============================================================
// Main
// ============================================================

Deno.serve(async (request) => {
  const url = new URL(request.url);

  const uuidKey = url.searchParams.get("uuid") || "";
  const view = (url.searchParams.get("view") || "").toLowerCase();

  if (!uuidKey) {
    return new Response("Missing uuid", { status: 400 });
  }

  const links = serverGroups[uuidKey];

  if (!links || !Array.isArray(links) || links.length === 0) {
    return new Response("Invalid uuid or empty group", { status: 404 });
  }


  // ============================================================
  // برای هر درخواست، IP جدید برای VLESSها انتخاب می‌شود.
  //
  // نکته:
  // این کار قبل از parse شدن انجام می‌شود تا هم:
  // 1. JSON
  // 2. Subscription
  //
  // دقیقاً از همان IP تصادفی استفاده کنند.
  // ============================================================

  const randomizedLinks = links.map((link) => {
    return randomizeVlessAddress(link);
  });


  // Parse links to nodes
 const nodes = randomizedLinks
  .map(parseLink)
  .filter((node) => node !== null);

  if (!nodes.length) {
    return new Response("No valid nodes", { status: 422 });
  }


  // ============================================================
  // Subscription view
  // ============================================================

  if (view === "sub") {

    const b64 = toBase64Utf8(
      randomizedLinks.join("\n")
    );

    return new Response(b64, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store"
      }
    });
  }


  // ============================================================
  // 1. Config LB
  // ============================================================

  const configLB = buildFullConfig(
    nodes,
    {
      type: "none",
      remarks: "⚡best load {بهترین سرعت}⚡"
    }
  );


  // ============================================================
  // 2. Config Fragment
  // ============================================================

  const configFragment = buildFullConfig(
    nodes,
    {
      type: "fragment",
      remarks: "Irancell"
    }
  );


  // ============================================================
  // 3. Config Beta
  // ============================================================

  const configBeta = buildFullConfig(
    nodes,
    {
      type: "finalMask",
      remarks: "Beta"
    }
  );


  return new Response(
    JSON.stringify(
      [
        configLB,
        configBeta
      ],
      null,
      2
    ),
    {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store"
      }
    }
  );
});


// ============================================================
// Server groups
// ============================================================

const serverGroups = {

  "1": [
        "vless://50414e45-4c5f-5a45-5553-3448ea55ea1a@104.25.102.179:443?encryption=none&security=tls&sni=ezzukteyue1s.akerfan180.workers.dev&fp=unsafe&type=ws&host=ezzukteyue1s.akerfan180.workers.dev&path=%2Fstream%2FPANEL_ZEUS%2F3448ea55ea1a#1",
        "vless://50414e45-4c5f-5a45-5553-cd490c072370@45.12.30.125:443?encryption=none&security=tls&sni=gdz543ezu4ds.v6qnd9c1.workers.dev&fp=unsafe&type=ws&host=gdz543ezu4ds.v6qnd9c1.workers.dev&path=%2Fstream%2FPANEL_ZEUS%2Fcd490c072370%2Floc-1#2",
        "vless://efd26d58-6fc6-4999-a02c-0ca13879a756@188.114.97.8:443?encryption=none&security=tls&sni=KI3aGm44dqq-2dJpSbGFKU71VU.DOCom47457.woRKErs.DEV&fp=chrome&alpn=http%2F1.1&type=ws&host=ki3agm44dqq-2djpsbgfku71vu.docom47457.workers.dev&path=%2Fvl%2FbZhNE35Gca3Tl4JrL3H34BpmfMoO9KL%3Fed%3D2560#3",
        "vless://292032c7-15a3-4eaf-8d76-076c13832278@172.66.44.200:443?encryption=none&security=tls&sni=testu.erfanfamily.ir&fp=chrome&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=testu.erfanfamily.ir&path=%2Fvl%2FKIG6R8zHJxjnEPNXIeF7YLPOG9oN4%3Fed%3D2560#4",
        "vless://08d047ca-af68-11f1-ab81-2fc870e97527@104.20.18.167:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=%2Fdk1.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%A9%F0%9F%87%B0%20Denmark",
        "vless://4ad15acc-aecf-11f1-8f31-837c274f3503@104.20.18.167:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&type=ws&host=yes.docom47457.workers.dev&path=nl4.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%B3%F0%9F%87%B1%20Netherlands%203",
        "vless://4f5acfc0-ae8d-11f1-a6c5-7351a845204f@104.20.18.167:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=usa4.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%BA%F0%9F%87%B8%20United%20States%20south",
        "vless://1e7cedac-b149-11f1-baef-af4c2e2a6fec@104.19.41.171:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=%2Fcz2.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%A8%F0%9F%87%BF%20czech%20republic"
      ],


  "2": [
        "vless://7850157b-2560-435e-9695-c8a76c30f31f@172.66.44.200:443?encryption=none&security=tls&sni=first.corw.ir&fp=random&alpn=http%2F1.1&type=ws&host=first.corw.ir&path=%2Fvl%2Fhn71UJzifNrP1a3UDm5mTmCS6hX1Gu%3Fed%3D2560#5",
        "vless://4199303a-8fd4-4e06-8799-7ccad9070671@172.66.47.176:443?encryption=none&security=tls&sni=tesr.erfanhub.ir&fp=random&alpn=http%2F1.1&type=ws&host=tesr.erfanhub.ir&path=%2Fvl%2FUoGuCC2ItjAG6iE80ZSx%3Fed%3D2560#6",
        "vless://c43c59c6-5fdd-4109-8d8d-66578c026f02@104.20.18.167:443?encryption=none&security=tls&sni=IOWzj-QENl8R7zjVMU7klxdCtT2R.wOdiwOW334.WOrkerS.DEV&fp=random&alpn=http%2F1.1&type=ws&host=iowzj-qenl8r7zjvmu7klxdctt2r.wodiwow334.workers.dev&path=%2Fvl%2FCvYgbOvrFqG4ihZhsExQ%3Fed%3D2560#7",
        "vless://02b1ea62-173d-43df-a566-6f0f65536e23@172.67.163.166:443?encryption=none&security=tls&sni=hola.erfanfamily.ir&fp=random&type=ws&host=hola.erfanfamily.ir&path=%2F%3Fed%3D2048#8",
        "vless://044e1200-adfa-11f1-8316-e32404299470@104.20.18.167:443?path=%2Fse1.vpnjantit.com%3A10002%2Fvpnjantit&security=tls&alpn=http%2F1.1&encryption=none&insecure=0&host=yes.docom47457.workers.dev&fp=chrome&type=ws&allowInsecure=0&sni=yes.docom47457.workers.dev#%F0%9F%87%B8%F0%9F%87%AA%20Sweden",
        "vless://c3703726-adfa-11f1-891e-73faf013285f@104.20.18.167:443?path=%2Fgr2.vpnjantit.com%3A10002%2Fvpnjantit&security=tls&alpn=http%2F1.1&encryption=none&insecure=0&host=yes.docom47457.workers.dev&fp=chrome&type=ws&allowInsecure=0&sni=yes.docom47457.workers.dev#%F0%9F%87%A9%F0%9F%87%AA%20Germany",
        "vless://63a4c430-aecf-11f1-bc52-0b8165c38c2e@104.20.18.167:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=nl1.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%B3%F0%9F%87%B1%20%20Netherlands%201",
        "vless://ef784d0c-b149-11f1-9ea2-070c697b6f59@104.20.18.167:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&type=ws&host=yes.docom47457.workers.dev&path=fr3.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%AB%F0%9F%87%B7%20France%205"
      ],


  "5": [
        "vless://08d047ca-af68-11f1-ab81-2fc870e97527@104.20.18.167:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=%2Fdk1.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%A9%F0%9F%87%B0%20Denmark",
        "vless://63a4c430-aecf-11f1-bc52-0b8165c38c2e@104.20.18.167:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=nl1.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%B3%F0%9F%87%B1%20%20Netherlands%201",
        "vless://6f72fbda-ae8c-11f1-9c21-52ac0074670e@104.20.18.167:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=safari&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=premiusa3.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%BA%F0%9F%87%B8%20United%20States%20west",
        "vless://9dc3875c-ab85-11f1-ad38-00163cbe6c97@104.20.18.167:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=%2Fbh2.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%A7%F0%9F%87%AD%20Bahrain",
        "vless://044e1200-adfa-11f1-8316-e32404299470@104.20.18.167:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=%2Fse1.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%B8%F0%9F%87%AA%20Sweden",
        "vless://3eca1933-bb13-41ad-8f79-4c5a3ec8408d@104.20.18.167:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=lokepanel-production.up.railway.app%3A443%2Fws%2F3eca1933-bb13-41ad-8f79-4c5a3ec8408d#%F0%9F%87%B3%F0%9F%87%B1%20%20Netherlands%202",
        "vless://fbcbfce4-ae8c-11f1-9f9f-7f062218636c@104.20.18.167:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=%2Flt1.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%B1%F0%9F%87%B9%20Lithuania",
        "vless://4f5acfc0-ae8d-11f1-a6c5-7351a845204f@104.20.18.167:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=usa4.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%BA%F0%9F%87%B8%20United%20States%20south",
        "vless://4ad15acc-aecf-11f1-8f31-837c274f3503@104.20.18.167:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=nl4.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%B3%F0%9F%87%B1%20Netherlands%203",
        "vless://9d067a70-aecf-11f1-bdc3-f7ffc0518623@104.20.18.167:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=it2.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%AE%F0%9F%87%B9%20Italy",
        "vless://d073ebc2-aecf-11f1-88f3-0b6a288ab511@104.20.18.167:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=bg2.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%A7%F0%9F%87%AC%20Bulgaria",
        "vless://c3703726-adfa-11f1-891e-73faf013285f@104.20.18.167:443?path=%2Fgr2.vpnjantit.com%3A10002%2Fvpnjantit&security=tls&alpn=http%2F1.1&encryption=none&insecure=0&host=yes.docom47457.workers.dev&fp=chrome&type=ws&allowInsecure=0&sni=yes.docom47457.workers.dev#%F0%9F%87%A9%F0%9F%87%AA%20Germany%201",
        "vless://2e3b54c8-af68-11f1-8bbd-dbbe26eaa2c8@104.20.18.167:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=%2Fuk.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%AC%F0%9F%87%A7%20United%20Kingdom",
        "vless://85dba328-af67-11f1-bd4e-e77e72402884@104.20.18.167:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=%2Ffr1.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%AB%F0%9F%87%B7%20France%204",
        "vless://292daee6-af67-11f1-92ea-c7d6fd9b3be9@104.20.18.167:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=%2Fee1.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%AA%F0%9F%87%AA%20Estonia%201",
        "vless://cb8b0256-af67-11f1-9dd3-2711d340f1ad@104.20.18.167:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=%2Ffr4.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%AB%F0%9F%87%B7%20France%203",
        "vless://b353b05a-b0cc-11f1-972a-77c2799f5c09@104.20.18.167:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=%2Ffr2.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%AB%F0%9F%87%B7%20France%202",
        "vless://2eb343c0-b0fd-11f1-8ad0-9b7c140afdf5@104.20.18.167:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=fi2.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%AB%F0%9F%87%AE%20Finland%202",
        "vless://46e753dc-b0fd-11f1-8c6f-eb999623fd27@104.20.18.167:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=fi1.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%AB%F0%9F%87%AE%20Finland%201",
        "vless://1e7cedac-b149-11f1-baef-af4c2e2a6fec@104.19.41.171:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=%2Fcz2.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%A8%F0%9F%87%BF%20czech%20republic",
        "vless://c5ee5af8-b149-11f1-a431-afe543fac05d@104.20.18.167:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=%2Fgr1.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%A9%F0%9F%87%AA%20Germany%202",
        "vless://ef784d0c-b149-11f1-9ea2-070c697b6f59@104.20.18.167:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&type=ws&host=yes.docom47457.workers.dev&path=fr3.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%AB%F0%9F%87%B7%20France%205",
        "vless://16819520-b14a-11f1-a272-93efe84a3045@104.25.206.186:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=%2Fru3.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%B7%F0%9F%87%BA%20Russia",
        "vless://c177cf84-b281-11f1-a3fb-dff8a84a723f@104.25.206.186:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=be1.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%A7%F0%9F%87%AA%20Belgium"
      ]

};


// ============================================================
// Helpers
// ============================================================


// انتخاب IP تصادفی برای VLESS
function randomizeVlessAddress(link) {

  if (typeof link !== "string") {
    return link;
  }

  if (!link.toLowerCase().startsWith("vless://")) {
    return link;
  }

  try {

    const u = new URL(link);

    // فقط Address عوض می‌شود
    // port / UUID / query / fragment دست نخورده می‌مانند
    u.hostname = getRandomProxyIP();

    return u.toString();

  } catch {

    // اگر لینک خراب بود همان لینک اصلی برگردانده شود
    return link;

  }
}


// ============================================================

function toBase64Utf8(str) {

  const bytes = new TextEncoder().encode(str);

  let bin = "";

  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }

  return btoa(bin);
}


// ============================================================

function safeTag(s) {

  return (s || "")
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9._-]/g, "")
    .slice(0, 48) || "node";
}


// ============================================================

function parseLink(link) {

  if (typeof link !== "string") {
    return null;
  }


  // ==========================================================
  // VMess
  // ==========================================================

  if (link.startsWith("vmess://")) {

    try {

      const b64 = link.slice(8).trim();

      const json = JSON.parse(
        decodeBase64ToUtf8(b64)
      );

      const tag = json.ps || "vmess";

      return {
        _raw: link,
        protocol: "vmess",
        tag,

        address: json.add || json.address,

        port: Number(
          json.port || 443
        ),

        uuid: json.id,

        alterId: Number(
          json.aid || 0
        ),

        security:
          json.tls === "tls"
            ? "tls"
            : "none",

        sni:
          json.sni ||
          json.host ||
          json.add,

        alpn:
          json.alpn
            ? [].concat(json.alpn)
            : ["http/1.1"],

        path:
          json.path || "/",

        hostHeader:
          json.host ||
          json.add,

        network:
          json.net || "tcp",

        fp:
          json.fp || "randomized"
      };

    } catch {

      return null;
    }
  }


  // ==========================================================
  // VLESS / Trojan
  // ==========================================================

  try {

    const u = new URL(link);

    const proto =
      u.protocol.replace(":", "");

    const tag =
      decodeURIComponent(
        u.hash.replace(/^#/, "")
      ) || proto;

    const host = u.hostname;

    const port =
      Number(
        u.port || "443"
      );

    const p = u.searchParams;


    // ========================================================
    // VLESS
    // ========================================================

    if (proto === "vless") {

      return {

        _raw: link,

        protocol: "vless",

        tag,

        address: host,

        port,

        uuid: u.username,

        security:
          p.get("security") ||
          "none",

        sni:
          p.get("sni") ||
          host,

        fp:
          p.get("fp") ||
          "randomized",

        alpn:
          (
            p.get("alpn") ||
            "http/1.1"
          ).split(","),

        path:
          p.get("path") ||
          "/",

        hostHeader:
          p.get("host") ||
          host,

        network:
          p.get("type") ||
          "tcp",

        ech:
          p.get("ech")
      };
    }


    // ========================================================
    // Trojan
    // ========================================================

    if (proto === "trojan") {

      return {

        _raw: link,

        protocol: "trojan",

        tag,

        address: host,

        port,

        password: u.username,

        security:
          p.get("security") ||
          "tls",

        sni:
          p.get("sni") ||
          host,

        path:
          p.get("path") ||
          "/",

        hostHeader:
          p.get("host") ||
          host,

        network:
          p.get("type") ||
          "tcp",

        ech:
          p.get("ech")
      };
    }

  } catch {

    return null;
  }

  return null;
}


// ============================================================

function decodeBase64ToUtf8(b64) {

  b64 =
    b64.replace(/\s+/g, "");

  const pad =
    b64.length % 4;

  if (pad) {
    b64 += "=".repeat(
      4 - pad
    );
  }

  const bin = atob(b64);

  const bytes =
    new Uint8Array(
      bin.length
    );

  for (
    let i = 0;
    i < bin.length;
    i++
  ) {
    bytes[i] =
      bin.charCodeAt(i);
  }

  return new TextDecoder()
    .decode(bytes);
}


// ============================================================
// Builders
// ============================================================

function buildOutbound(
  node,
  idx,
  mode
) {

  const t =
    safeTag(node.tag);

  const tag =
    `node-${idx}-${t}`;


  const base = {

    tag,

    protocol:
      node.protocol,

    streamSettings:
      buildStream(
        node,
        mode
      )
  };


  // ==========================================================
  // VLESS
  // ==========================================================

  if (
    node.protocol === "vless"
  ) {

    base.settings = {

      vnext: [

        {

          // اینجا IP تصادفی انتخاب‌شده قرار دارد
          address:
            node.address,

          port:
            node.port,

          users: [

            {

              id:
                node.uuid,

              encryption:
                "none",

              level:
                8
            }

          ]

        }

      ]

    };

  }


  // ==========================================================
  // Trojan
  // ==========================================================

  else if (
    node.protocol === "trojan"
  ) {

    base.settings = {

      servers: [

        {

          address:
            node.address,

          port:
            node.port,

          password:
            node.password,

          level:
            8

        }

      ]

    };

  }


  // ==========================================================
  // VMess
  // ==========================================================

  else if (
    node.protocol === "vmess"
  ) {

    base.settings = {

      vnext: [

        {

          address:
            node.address,

          port:
            node.port,

          users: [

            {

              id:
                node.uuid,

              alterId:
                node.alterId || 0,

              security:
                "auto"
            }

          ]

        }

      ]

    };

  }


  return base;
}


// ============================================================

function buildStream(
  node,
  mode
) {

  const s = {

    network:
      node.network,

    security:
      node.security === "tls"
        ? "tls"
        : "",

    sockopt: {

      domainStrategy:
        "UseIPv4v6"
    }

  };


  // ==========================================================
  // TLS
  // ==========================================================

  if (
    node.security === "tls"
  ) {

    s.tlsSettings = {

      allowInsecure:
        false,

      fingerprint:
        mode === "finalMask"
          ? "unsafe"
          : (
              node.fp ||
              "randomized"
            ),

      alpn:
        node.alpn ||
        ["http/1.1"],

      serverName:
        node.sni ||
        node.address

    };


    // ========================================================
    // CipherSuites — Beta
    // ========================================================

    if (
      mode === "finalMask"
    ) {

      s.tlsSettings.cipherSuites =
        "TLS_AES_256_GCM_SHA384:" +
        "TLS_CHACHA20_POLY1305_SHA256:" +
        "TLS_AES_128_GCM_SHA256:" +
        "TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384:" +
        "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384:" +
        "TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256:" +
        "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256:" +
        "TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256:" +
        "TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256:" +
        "TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA:" +
        "TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA:" +
        "TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA256:" +
        "TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256";
    }


    // ========================================================
    // ECH
    // ========================================================

    if (node.ech) {

      s.tlsSettings.echSettings = {

        enable: true,

        config:
          node.ech
      };
    }

  }


  // ==========================================================
  // WebSocket
  // ==========================================================

  if (
    node.network === "ws"
  ) {

    s.wsSettings = {

      path:
        node.path || "/",

      headers: {

        Host:
          node.hostHeader ||
          node.address

      }

    };

  }


  // ==========================================================
  // Fragment
  // ==========================================================

  if (
    mode === "fragment"
  ) {

    s.sockopt.dialerProxy =
      "fragment";

  }

  else if (
    mode === "finalMask"
  ) {

    s.sockopt.dialerProxy =
      "finalMask";

  }


  return s;
}


// ============================================================

function buildFullConfig(
  nodes,
  options
) {

  const {
    type,
    remarks
  } = options;


  // ==========================================================
  // Outbounds
  // ==========================================================

  const outbounds =
    nodes.map(
      (n, i) =>
        buildOutbound(
          n,
          i + 1,
          type
        )
    );


  const nodeTags =
    outbounds.map(
      o => o.tag
    );


  // ==========================================================
  // Fragment
  // ==========================================================

  if (
    type === "fragment"
  ) {

    outbounds.push({

      tag:
        "fragment",

      protocol:
        "freedom",

      settings: {

        fragment: {

          packets:
            "tlshello",

          length:
            "1",

          interval:
            "0"
        },

        domainStrategy:
          "UseIPv4v6"
      }

    });

  }


  // ==========================================================
  // Beta / finalMask
  // ==========================================================

  else if (
    type === "finalMask"
  ) {

    outbounds.push({

      tag:
        "finalMask",

      protocol:
        "freedom",

      settings: {

        domainStrategy:
          "UseIPv4v6",

        finalMask: {

          tcp: [

            {

              type:
                "fragment",

              settings: {

                packets:
                  "tlshello",

                lengths:
                  [
                    "5",
                    "94",
                    "1"
                  ],

                delays:
                  ["0"],

                maxSplit:
                  "0"
              }

            },

            {

              type:
                "fragment",

              settings: {

                packets:
                  "1-1",

                lengths:
                  [
                    "109",
                    "1"
                  ],

                delays:
                  ["1"],

                maxSplit:
                  "355"
              }

            }

          ]

        }

      }

    });

  }


  // ==========================================================
  // Default outbounds
  // ==========================================================

  outbounds.push({

    protocol:
      "dns",

    tag:
      "dns-out"

  });


  outbounds.push({

    protocol:
      "freedom",

    tag:
      "direct",

    settings: {

      domainStrategy:
        "UseIP"
    }

  });


  outbounds.push({

    protocol:
      "blackhole",

    tag:
      "block",

    settings: {

      response: {

        type:
          "http"
      }

    }

  });


  // ==========================================================
  // Main config
  // ==========================================================

  const cfg = {

    remarks,

    log: {

      loglevel:
        "warning"
    },


    // ========================================================
    // DNS
    // ========================================================

    dns: {

      hosts: {

        "domain:googleapis.cn":
          "googleapis.com"

      },

      servers:
        ["1.1.1.1"]

    },


    // ========================================================
    // Inbounds
    // ========================================================

    inbounds: [

      {

        tag:
          "socks-in",

        port:
          10808,

        listen:
          "0.0.0.0",

        protocol:
          "socks",

        settings: {

          auth:
            "noauth",

          udp:
            true,

          userLevel:
            8

        },

        sniffing: {

          enabled:
            true,

          routeOnly:
            true,

          destOverride:
            [
              "http",
              "tls"
            ]

        }

      },


      {

        tag:
          "http",

        port:
          10809,

        listen:
          "0.0.0.0",

        protocol:
          "http",

        sniffing: {

          enabled:
            true,

          destOverride:
            [
              "http",
              "tls"
            ],

          routeOnly:
            false

        },

        settings: {

          auth:
            "noauth",

          udp:
            true,

          allowTransparent:
            false

        }

      },


      {

        tag:
          "dns-in",

        port:
          10853,

        protocol:
          "dokodemo-door",

        settings: {

          address:
            "1.1.1.1",

          network:
            "tcp,udp",

          port:
            53

        }

      },


      {

        tag:
          "api",

        port:
          10813,

        listen:
          "127.0.0.1",

        protocol:
          "dokodemo-door",

        settings: {

          udp:
            false,

          address:
            "127.0.0.1",

          allowTransparent:
            false

        }

      }

    ],


    // ========================================================
    // Outbounds
    // ========================================================

    outbounds,


    // ========================================================
    // Policy
    // ========================================================

    policy: {

      levels: {

        "8": {

          connIdle:
            300,

          downlinkOnly:
            1,

          handshake:
            4,

          uplinkOnly:
            1

        }

      },

      system: {

        statsOutboundUplink:
          true,

        statsOutboundDownlink:
          true

      }

    },


    // ========================================================
    // Routing
    // ========================================================

    routing: {

      domainStrategy:
        "IPIfNonMatch",

      domainMatcher:
        "hybrid",

      rules: [

        {

          type:
            "field",

          inboundTag:
            [
              "socks-in",
              "http"
            ],

          balancerTag:
            "auto"

        }

      ],


      balancers: [

        {

          tag:
            "auto",

          selector:
            nodeTags,


          strategy: {

            type:
              "leastLoad"

          }

        }

      ]

    },


    // ========================================================
    // Stats
    // ========================================================

    stats: {},


    // ========================================================
    // API
    // ========================================================

    api: {

      tag:
        "api",

      services:
        [
          "StatsService"
        ]

    },


    // ========================================================
    // Fast Observatory
    // ========================================================

    burstObservatory: {

      pingConfig: {

        connectivity:
          "http://connectivitycheck.platform.hicloud.com/generate_204",

        destination:
          "http://www.google.com/gen_204",

        interval:
          "30s",

        sampling:
          5,

        timeout:
          "2s"

      },


      subjectSelector:
        nodeTags

    }

  };


  // ==========================================================
  // Beta compatibility information
  // ==========================================================

  if (
    type === "finalMask"
  ) {

    cfg._coreCheck = {

      featureRequired:
        "finalMask",

      compatibleApp:
        "PattNG / Custom Xray Core",

      warningNotice:
        "If your Xray core fails to load this config, please update your client to PattNG or a core supporting finalMask."

    };

  }


  return cfg;
}
