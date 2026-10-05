// Cloudflare Worker — Xray dynamic best-ping (every 30s) + Fragment + Beta (finalMask)
// Output: JSON array with three full configs
// Routes:
//   /?uuid=1              -> [ LoadBalance, Irancell (Fragment), Beta LoadBalance (finalMask) ]
//   /?uuid=1&view=sub     -> v2rayN/NG subscription with randomized VLESS IPs
//   /?uuid=1&view=fragment -> هر سرور جدا (بدون لودبالانس)، هرکدام با Fragment
//   /?uuid=1&view=beta     -> هر سرور جدا (بدون لودبالانس)، هرکدام با Beta (finalMask)


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
// فعال / غیرفعال کردن هر کدام از سه کانفیگ خروجی
// true = فعال بماند   |   false = از خروجی حذف شود
// ============================================================

const ENABLED_CONFIGS = {
  bestload: true,   // ⚡ best load (بدون فرگمنت)
  irancell: false,   // Fragment (Irancell)
  beta: true         // finalMask (Beta)
};


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

  // ============================================================
  // بعضی از سرورها می‌توانند "مستقیم" (direct) باشند؛ یعنی آدرس
  // آن‌ها با IPهای بالا (PROXY_IPS) تلفیق/تصادفی نشود و همان
  // آی‌پی اصلی خودشان باقی بماند.
  //
  // برای مستقیم کردن یک سرور خاص، همان لینک را در serverGroups
  // به‌جای رشتهٔ ساده، به این شکل بنویسید:
  //   { url: "vless://....", direct: true }
  //
  // سرورهایی که به همین شکل ساده (رشتهٔ متنی) باقی بمانند،
  // طبق روال قبلی با یکی از PROXY_IPS تلفیق می‌شوند.
  // ============================================================

  const randomizedLinks = links.map((entry) => {
    const isObj = entry && typeof entry === "object";
    const link = isObj ? entry.url : entry;
    const isDirect = isObj && entry.direct === true;

    return isDirect ? link : randomizeVlessAddress(link);
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
  // per-server view (view=fragment / view=beta)
  //
  // برخلاف حالت پیش‌فرض که همهٔ سرورها را یکجا با هم لودبالانس
  // می‌کند، اینجا برای هر سرور یک کانفیگ کامل و مستقل ساخته
  // می‌شود (هر کدام با همان نوع Fragment یا Beta/finalMask).
  // خروجی یک آرایهٔ JSON است؛ هر آیتم = یک پروفایل جداگانه.
  // ============================================================

  if (view === "fragment" || view === "beta") {

    const type = view === "beta" ? "finalMask" : "fragment";
    const label = view === "beta" ? "Beta" : "Irancell";

    const perServerConfigs = nodes.map((node, i) => {
      const remarks = `${node.tag || ("Server " + (i + 1))} | ${label}`;

      // Beta = ساختار فایل SNI (finalmask داخل streamSettings)
      if (view === "beta") {
        return buildSniConfig(node, remarks);
      }

      return buildFullConfig([node], { type, remarks });
    });

    return new Response(
      JSON.stringify(perServerConfigs, null, 2),
      {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store"
        }
      }
    );
  }


  // ============================================================
  // ساخت کانفیگ‌ها فقط برای مواردی که در ENABLED_CONFIGS فعال‌اند
  // ============================================================

  const result = [];

  // 1. Config LB (best load)
  if (ENABLED_CONFIGS.bestload) {
    result.push(
      buildFullConfig(
        nodes,
        {
          type: "none",
          remarks: "⚡best load {بهترین سرعت}⚡"
        }
      )
    );
  }

  // 2. Config Fragment (Irancell)
  if (ENABLED_CONFIGS.irancell) {
    result.push(
      buildFullConfig(
        nodes,
        {
          type: "fragment",
          remarks: "Irancell"
        }
      )
    );
  }

  // 3. Config Beta (finalMask) — یک کانفیگ لودبالانس برای همهٔ سرورها
  // (پروفایل‌های جدا جدا فقط در view=beta برمی‌گردند)
  if (ENABLED_CONFIGS.beta) {
    result.push(
      buildSniLoadBalanceConfig(
        nodes,
        "⚡Beta load balance⚡"
      )
    );
  }

  return new Response(
    JSON.stringify(
      result,
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
        "vless://50414e45-4c5f-5a45-5553-3448ea55ea1a@104.16.66.15:443?encryption=none&security=tls&sni=sdxas.erfanfamily2.ir&fp=unsafe&ech=cloudflare-ech.com%2Bhttps%3A%2F%2F8.8.8.8%2Fdns-query&type=ws&host=sdxas.erfanfamily2.ir&path=%2Fstream%2FPANEL_ZEUS%2F3448ea55ea1a#1",
        "vless://62826bbf-5d5e-4d31-af7a-d2ed39b16960@104.16.70.194:443?encryption=none&security=tls&sni=joke.erfanhub.ir&fp=chrome&ech=cloudflare-ech.com%2Bhttps%3A%2F%2F8.8.8.8%2Fdns-query&type=ws&host=joke.erfanhub.ir&path=%2Fd6c82ee02bff#2",
        "vless://efd26d58-6fc6-4999-a02c-0ca13879a756@104.16.181.106:443?encryption=none&security=tls&sni=KI3aGm44dqq-2dJpSbGFKU71VU.DOCom47457.woRKErs.DEV&fp=chrome&alpn=http%2F1.1&ech=cloudflare-ech.com%2Bhttps%3A%2F%2F8.8.8.8%2Fdns-query&type=ws&host=ki3agm44dqq-2djpsbgfku71vu.docom47457.workers.dev&path=%2Fvl%2FbZhNE35Gca3Tl4JrL3H34BpmfMoO9KL%3Fed%3D2560#3",
        "vless://50414e45-4c5f-5a45-5553-871460e521d6@104.16.68.102:443?path=%2Fstream%2FPANEL_ZEUS%2F871460e521d6&security=tls&encryption=none&insecure=0&host=lokav.erfanfamily.ir&ech=lido.fi%2Budp%3A%2F%2F149.112.112.112%3A9953&type=ws&allowInsecure=0&sni=lokav.erfanfamily.ir#4",
        { url: "vless://d75eff29-18c1-479d-9653-1ad52fecdfe4@69.46.46.91:443?encryption=none&security=tls&type=ws&host=daszsdpd.up.railway.app&path=%2Fws#railway", direct: true },
        "vless://1428fdd2-bd15-11f1-89f7-67be7b63e65b@104.25.206.186:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&ech=cloudflare-ech.com%2Bhttps%3A%2F%2F8.8.8.8%2Fdns-query&fm=%7B%22tcp%22%3A%5B%7B%22type%22%3A%22fragment%22%2C%22settings%22%3A%7B%22packets%22%3A%22tlshello%22%2C%22lengths%22%3A%5B%220%22%2C%22104%22%2C%221%22%5D%2C%22delays%22%3A%5B%220%22%5D%2C%22maxSplit%22%3A%220%22%7D%7D%2C%7B%22type%22%3A%22fragment%22%2C%22settings%22%3A%7B%22packets%22%3A%221-1%22%2C%22lengths%22%3A%5B%22114%22%2C%221%22%5D%2C%22delays%22%3A%5B%221%22%5D%2C%22maxSplit%22%3A%2211%22%7D%7D%5D%7D&type=ws&host=yes.docom47457.workers.dev&path=%2Fdk1.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%A9%F0%9F%87%B0%20Denmark",
        "vless://6a2aab0c-b9ca-11f1-a147-dfcc183c6810@154.211.8.195:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&ech=cloudflare-ech.com%2Bhttps%3A%2F%2F8.8.8.8%2Fdns-query&fm=%7B%22tcp%22%3A%5B%7B%22type%22%3A%22fragment%22%2C%22settings%22%3A%7B%22packets%22%3A%22tlshello%22%2C%22lengths%22%3A%5B%220%22%2C%22104%22%2C%221%22%5D%2C%22delays%22%3A%5B%220%22%5D%2C%22maxSplit%22%3A%220%22%7D%7D%2C%7B%22type%22%3A%22fragment%22%2C%22settings%22%3A%7B%22packets%22%3A%221-1%22%2C%22lengths%22%3A%5B%22114%22%2C%221%22%5D%2C%22delays%22%3A%5B%221%22%5D%2C%22maxSplit%22%3A%2211%22%7D%7D%5D%7D&type=ws&host=yes.docom47457.workers.dev&path=%2Fse1.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%B8%F0%9F%87%AA%20Sweden",
        { url: "vless://5e5b0489-3650-4873-a6af-cb274a1f45ef@69.46.46.91:443?encryption=none&security=tls&sni=lokalo.up.railway.app&fp=chrome&alpn=http%2F1.1&type=ws&host=lokalo.up.railway.app&path=%2FSideRail%2Fws-rp5TeRoF#%F0%9F%87%B3%F0%9F%87%B1%20Netherlands%20%20railway", direct: true },
        "vless://8e405a67-52a5-fc28-df7e-3c7f949d055f@104.16.102.15:443?path=%2Fkolgerpanel-production.up.railway.app%3A443%2Fws%2F8e405a67-52a5-fc28-df7e-3c7f949d055f&security=tls&alpn=http%2F1.1&encryption=none&insecure=0&host=yes.docom47457.workers.dev&fp=chrome&ech=cloudflare-ech.com%2Bhttps%3A%2F%2F8.8.8.8%2Fdns-query&type=ws&allowInsecure=0&sni=yes.docom47457.workers.dev#%F0%9F%87%BA%F0%9F%87%B8%20United%20States%20east%202",
        "vless://50414e45-4c5f-5a45-5553-3448ea55ea1a@104.16.194.147:443?path=%2Fstream%2FPANEL_ZEUS%2F3448ea55ea1a&security=tls&encryption=none&insecure=0&host=sdxas.erfanfamily2.ir&type=ws&allowInsecure=0&sni=sdxas.erfanfamily2.ir#1%20irancell",
        "vless://62826bbf-5d5e-4d31-af7a-d2ed39b16960@104.18.114.234:443?path=%2Fd6c82ee02bff&security=tls&encryption=none&insecure=0&host=joke.erfanhub.ir&fp=chrome&type=ws&allowInsecure=0&sni=joke.erfanhub.ir#2%20irancell",
        "vless://efd26d58-6fc6-4999-a02c-0ca13879a756@104.16.70.194:443?path=%2Fvl%2FbZhNE35Gca3Tl4JrL3H34BpmfMoO9KL%3Fed%3D2560&security=tls&alpn=http%2F1.1&encryption=none&insecure=0&host=ki3agm44dqq-2djpsbgfku71vu.docom47457.workers.dev&fp=chrome&type=ws&allowInsecure=0&sni=KI3aGm44dqq-2dJpSbGFKU71VU.DOCom47457.woRKErs.DEV#3%20irancell",
        "vless://50414e45-4c5f-5a45-5553-871460e521d6@104.20.18.167:443?path=%2Fstream%2FPANEL_ZEUS%2F871460e521d6&security=tls&encryption=none&insecure=0&host=lokav.erfanfamily.ir&type=ws&allowInsecure=0&sni=lokav.erfanfamily.ir#4%20irancell"
      ],


  "2": [
        "vless://7850157b-2560-435e-9695-c8a76c30f31f@[2606:4700:4700::1001]:443?path=%2Fvl%2Fhn71UJzifNrP1a3UDm5mTmCS6hX1Gu%3Fed%3D2560&security=tls&alpn=http%2F1.1&encryption=none&insecure=0&host=first.corw.ir&fp=random&type=ws&allowInsecure=0&sni=first.corw.ir#5",
        "vless://4199303a-8fd4-4e06-8799-7ccad9070671@104.20.18.167:443?encryption=none&security=tls&sni=tesr.erfanhub.ir&fp=chrome&alpn=http%2F1.1&ech=cloudflare-ech.com%2Bhttps%3A%2F%2F8.8.8.8%2Fdns-query&type=ws&host=tesr.erfanhub.ir&path=%2Fvl%2FDhtZmLizIyprHdr97rQ%3Fed%3D2560#6",
        "vless://c43c59c6-5fdd-4109-8d8d-66578c026f02@104.16.102.15:443?encryption=none&security=tls&sni=IOWzj-QENl8R7zjVMU7klxdCtT2R.wOdiwOW334.WOrkerS.DEV&fp=random&alpn=http%2F1.1&ech=cloudflare-ech.com%2Bhttps%3A%2F%2F8.8.8.8%2Fdns-query&type=ws&host=iowzj-qenl8r7zjvmu7klxdctt2r.wodiwow334.workers.dev&path=%2Fvl%2FCvYgbOvrFqG4ihZhsExQ%3Fed%3D2560#7",
        "vless://02b1ea62-173d-43df-a566-6f0f65536e23@172.66.210.80:443?path=%2F%3Fed%3D2048&security=tls&encryption=none&insecure=0&host=hola.erfanfamily.ir&fp=chrome&ech=cloudflare-ech.com%2Bhttps%3A%2F%2F8.8.8.8%2Fdns-query&type=ws&allowInsecure=0&sni=hola.erfanfamily.ir#8",
        "vless://4fd00864-b9cb-11f1-8009-37052120d486@154.211.8.195:443?encryption=none&security=tls&sni=joke.corw.ir&type=ws&host=joke.corw.ir&path=fr3.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%AB%F0%9F%87%B7%20France%205",
        "vless://57f950a2-6a87-c863-a3f7-bff34487d7c4@104.16.196.44:443?encryption=none&security=tls&sni=joke.corw.ir&fp=chrome&alpn=http%2F1.1&ech=cloudflare-ech.com%2Bhttps%3A%2F%2F8.8.8.8%2Fdns-query&type=ws&host=joke.corw.ir&path=polllanszx-production.up.railway.app%3A443%2Fws%2F57f950a2-6a87-c863-a3f7-bff34487d7c4#%F0%9F%87%B3%F0%9F%87%B1%20%20Netherlands%201",
        { url: "vless://420fb9d3-3640-46bc-af94-289e2f12db43@69.46.46.90:443?path=%2FSideRail%2Fws-uwQMOxLz&security=tls&alpn=http%2F1.1&encryption=none&insecure=0&host=siderail-production-d19a.up.railway.app&fp=chrome&type=ws&allowInsecure=0&sni=siderail-production-d19a.up.railway.app#%F0%9F%87%BA%F0%9F%87%B8%20United%20States%20east%203", direct: true },
        { url: "vless://4c509c66-376e-4df2-aaa6-76b05030ecda@69.46.46.90:443?encryption=none&security=tls&sni=dfvsvdxc.up.railway.app&fp=chrome&alpn=http%2F1.1&type=ws&host=dfvsvdxc.up.railway.app&path=%2Fws%2F230e40e1-06e0-48fc-a232-e678c7ba64d4%3Fed%3D2560#%F0%9F%87%B3%F0%9F%87%B1%20Netherlands%202", direct: true },
        "vless://7850157b-2560-435e-9695-c8a76c30f31f@104.18.114.234:443?path=%2Fvl%2Fhn71UJzifNrP1a3UDm5mTmCS6hX1Gu%3Fed%3D2560&security=tls&alpn=http%2F1.1&encryption=none&insecure=0&host=first.corw.ir&fp=random&type=ws&allowInsecure=0&sni=first.corw.ir#5%20irancell",
        "vless://4199303a-8fd4-4e06-8799-7ccad9070671@104.16.67.219:443?path=%2Fvl%2FDhtZmLizIyprHdr97rQ%3Fed%3D2560&security=tls&alpn=http%2F1.1&encryption=none&insecure=0&host=tesr.erfanhub.ir&fp=chrome&type=ws&allowInsecure=0&sni=tesr.erfanhub.ir#6%20irancell",
        "vless://c43c59c6-5fdd-4109-8d8d-66578c026f02@104.18.114.234:443?path=%2Fvl%2FCvYgbOvrFqG4ihZhsExQ%3Fed%3D2560&security=tls&alpn=http%2F1.1&encryption=none&fm=%7B%22tcp%22%3A%5B%7B%22type%22%3A%22fragment%22%2C%22settings%22%3A%7B%22packets%22%3A%22tlshello%22%2C%22lengths%22%3A%5B%220%22%2C%22104%22%2C%221%22%5D%2C%22delays%22%3A%5B%220%22%5D%2C%22maxSplit%22%3A%220%22%7D%7D%2C%7B%22type%22%3A%22fragment%22%2C%22settings%22%3A%7B%22packets%22%3A%221-1%22%2C%22lengths%22%3A%5B%22114%22%2C%221%22%5D%2C%22delays%22%3A%5B%221%22%5D%2C%22maxSplit%22%3A%2211%22%7D%7D%5D%7D&insecure=0&host=iowzj-qenl8r7zjvmu7klxdctt2r.wodiwow334.workers.dev&fp=random&type=ws&allowInsecure=0&sni=IOWzj-QENl8R7zjVMU7klxdCtT2R.wOdiwOW334.WOrkerS.DEV#7%20irancell",
        "vless://02b1ea62-173d-43df-a566-6f0f65536e23@104.16.102.15:443?path=%2F%3Fed%3D2048&security=tls&encryption=none&insecure=0&host=hola.erfanfamily.ir&fp=chrome&type=ws&allowInsecure=0&sni=hola.erfanfamily.ir#8%20irancell",
        "vless://57f950a2-6a87-c863-a3f7-bff34487d7c4@104.16.70.194:443?path=polllanszx-production.up.railway.app%3A443%2Fws%2F57f950a2-6a87-c863-a3f7-bff34487d7c4&security=tls&alpn=http%2F1.1&encryption=none&insecure=0&host=joke.corw.ir&fp=chrome&type=ws&allowInsecure=0&sni=joke.corw.ir#%F0%9F%87%B3%F0%9F%87%B1%20%20Netherlands%201%20irancell",
        { url: "vless://420fb9d3-3640-46bc-af94-289e2f12db43@69.46.46.90:443?path=%2FSideRail%2Fws-uwQMOxLz&security=tls&alpn=http%2F1.1&encryption=none&insecure=0&host=siderail-production-d19a.up.railway.app&fp=chrome&type=ws&allowInsecure=0&sni=siderail-production-d19a.up.railway.app#%F0%9F%87%BA%F0%9F%87%B8%20United%20States%20east%203%20irancell", direct: true },
        { url: "vless://4c509c66-376e-4df2-aaa6-76b05030ecda@69.46.46.90:443?path=%2Fws%2F230e40e1-06e0-48fc-a232-e678c7ba64d4%3Fed%3D2560&security=tls&alpn=http%2F1.1&encryption=none&insecure=0&host=dfvsvdxc.up.railway.app&fp=chrome&type=ws&allowInsecure=0&sni=dfvsvdxc.up.railway.app#%F0%9F%87%B3%F0%9F%87%B1%20Netherlands%202%20irancell", direct: true },
        "vless://8b75d9aa-bd15-11f1-a2c6-6fdb7335ecc7@104.20.18.167:443?path=%2Ffr4.vpnjantit.com%3A10002%2Fvpnjantit&security=tls&alpn=http%2F1.1&encryption=none&insecure=0&host=yes.docom47457.workers.dev&fp=chrome&type=ws&allowInsecure=0&sni=yes.docom47457.workers.dev#%F0%9F%87%AB%F0%9F%87%B7%20France%203"
        "vless://4199303a-8fd4-4e06-8799-7ccad9070671@104.20.18.167:443?encryption=none&security=tls&sni=tesr.erfanhub.ir&fp=chrome&alpn=http%2F1.1&ech=cloudflare-ech.com%2Bhttps%3A%2F%2F8.8.8.8%2Fdns-query&type=ws&host=tesr.erfanhub.ir&path=%2Fvl%2FDhtZmLizIyprHdr97rQ%3Fed%3D2560#6",
        "vless://c43c59c6-5fdd-4109-8d8d-66578c026f02@104.25.206.186:443?encryption=none&security=tls&sni=IOWzj-QENl8R7zjVMU7klxdCtT2R.wOdiwOW334.WOrkerS.DEV&fp=random&alpn=http%2F1.1&fm=%7B%22tcp%22%3A%5B%7B%22type%22%3A%22fragment%22%2C%22settings%22%3A%7B%22packets%22%3A%22tlshello%22%2C%22lengths%22%3A%5B%220%22%2C%22104%22%2C%221%22%5D%2C%22delays%22%3A%5B%220%22%5D%2C%22maxSplit%22%3A%220%22%7D%7D%2C%7B%22type%22%3A%22fragment%22%2C%22settings%22%3A%7B%22packets%22%3A%221-1%22%2C%22lengths%22%3A%5B%22114%22%2C%221%22%5D%2C%22delays%22%3A%5B%221%22%5D%2C%22maxSplit%22%3A%2211%22%7D%7D%5D%7D&type=ws&host=iowzj-qenl8r7zjvmu7klxdctt2r.wodiwow334.workers.dev&path=%2Fvl%2FCvYgbOvrFqG4ihZhsExQ%3Fed%3D2560#7",
        "vless://02b1ea62-173d-43df-a566-6f0f65536e23@172.66.210.80:443?path=%2F%3Fed%3D2048&security=tls&encryption=none&insecure=0&host=hola.erfanfamily.ir&fp=chrome&ech=cloudflare-ech.com%2Bhttps%3A%2F%2F8.8.8.8%2Fdns-query&type=ws&allowInsecure=0&sni=hola.erfanfamily.ir#8",
        "vless://4fd00864-b9cb-11f1-8009-37052120d486@154.211.8.195:443?encryption=none&security=tls&sni=joke.corw.ir&type=ws&host=joke.corw.ir&path=fr3.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%AB%F0%9F%87%B7%20France%205",
        "vless://57f950a2-6a87-c863-a3f7-bff34487d7c4@104.16.196.44:443?encryption=none&security=tls&sni=joke.corw.ir&fp=chrome&alpn=http%2F1.1&ech=cloudflare-ech.com%2Bhttps%3A%2F%2F8.8.8.8%2Fdns-query&type=ws&host=joke.corw.ir&path=polllanszx-production.up.railway.app%3A443%2Fws%2F57f950a2-6a87-c863-a3f7-bff34487d7c4#%F0%9F%87%B3%F0%9F%87%B1%20%20Netherlands%201",
        { url: "vless://420fb9d3-3640-46bc-af94-289e2f12db43@69.46.46.90:443?path=%2FSideRail%2Fws-uwQMOxLz&security=tls&alpn=http%2F1.1&encryption=none&insecure=0&host=siderail-production-d19a.up.railway.app&fp=chrome&type=ws&allowInsecure=0&sni=siderail-production-d19a.up.railway.app#%F0%9F%87%BA%F0%9F%87%B8%20United%20States%20east%203", direct: true },
        { url: "vless://4c509c66-376e-4df2-aaa6-76b05030ecda@69.46.46.90:443?encryption=none&security=tls&sni=dfvsvdxc.up.railway.app&fp=chrome&alpn=http%2F1.1&type=ws&host=dfvsvdxc.up.railway.app&path=%2Fws%2F230e40e1-06e0-48fc-a232-e678c7ba64d4%3Fed%3D2560#%F0%9F%87%B3%F0%9F%87%B1%20Netherlands%202", direct: true },
        "vless://7850157b-2560-435e-9695-c8a76c30f31f@104.18.114.234:443?path=%2Fvl%2Fhn71UJzifNrP1a3UDm5mTmCS6hX1Gu%3Fed%3D2560&security=tls&alpn=http%2F1.1&encryption=none&insecure=0&host=first.corw.ir&fp=random&type=ws&allowInsecure=0&sni=first.corw.ir#5%20irancell",
        "vless://4199303a-8fd4-4e06-8799-7ccad9070671@104.16.67.219:443?path=%2Fvl%2FDhtZmLizIyprHdr97rQ%3Fed%3D2560&security=tls&alpn=http%2F1.1&encryption=none&insecure=0&host=tesr.erfanhub.ir&fp=chrome&type=ws&allowInsecure=0&sni=tesr.erfanhub.ir#6%20irancell",
        "vless://c43c59c6-5fdd-4109-8d8d-66578c026f02@104.18.114.234:443?path=%2Fvl%2FCvYgbOvrFqG4ihZhsExQ%3Fed%3D2560&security=tls&alpn=http%2F1.1&encryption=none&fm=%7B%22tcp%22%3A%5B%7B%22type%22%3A%22fragment%22%2C%22settings%22%3A%7B%22packets%22%3A%22tlshello%22%2C%22lengths%22%3A%5B%220%22%2C%22104%22%2C%221%22%5D%2C%22delays%22%3A%5B%220%22%5D%2C%22maxSplit%22%3A%220%22%7D%7D%2C%7B%22type%22%3A%22fragment%22%2C%22settings%22%3A%7B%22packets%22%3A%221-1%22%2C%22lengths%22%3A%5B%22114%22%2C%221%22%5D%2C%22delays%22%3A%5B%221%22%5D%2C%22maxSplit%22%3A%2211%22%7D%7D%5D%7D&insecure=0&host=iowzj-qenl8r7zjvmu7klxdctt2r.wodiwow334.workers.dev&fp=random&type=ws&allowInsecure=0&sni=IOWzj-QENl8R7zjVMU7klxdCtT2R.wOdiwOW334.WOrkerS.DEV#7%20irancell",
        "vless://02b1ea62-173d-43df-a566-6f0f65536e23@104.16.102.15:443?path=%2F%3Fed%3D2048&security=tls&encryption=none&insecure=0&host=hola.erfanfamily.ir&fp=chrome&type=ws&allowInsecure=0&sni=hola.erfanfamily.ir#8%20irancell",
        "vless://57f950a2-6a87-c863-a3f7-bff34487d7c4@104.16.70.194:443?path=polllanszx-production.up.railway.app%3A443%2Fws%2F57f950a2-6a87-c863-a3f7-bff34487d7c4&security=tls&alpn=http%2F1.1&encryption=none&insecure=0&host=joke.corw.ir&fp=chrome&type=ws&allowInsecure=0&sni=joke.corw.ir#%F0%9F%87%B3%F0%9F%87%B1%20%20Netherlands%201%20irancell",
        { url: "vless://420fb9d3-3640-46bc-af94-289e2f12db43@69.46.46.90:443?path=%2FSideRail%2Fws-uwQMOxLz&security=tls&alpn=http%2F1.1&encryption=none&insecure=0&host=siderail-production-d19a.up.railway.app&fp=chrome&type=ws&allowInsecure=0&sni=siderail-production-d19a.up.railway.app#%F0%9F%87%BA%F0%9F%87%B8%20United%20States%20east%203%20irancell", direct: true },
        { url: "vless://4c509c66-376e-4df2-aaa6-76b05030ecda@69.46.46.90:443?path=%2Fws%2F230e40e1-06e0-48fc-a232-e678c7ba64d4%3Fed%3D2560&security=tls&alpn=http%2F1.1&encryption=none&insecure=0&host=dfvsvdxc.up.railway.app&fp=chrome&type=ws&allowInsecure=0&sni=dfvsvdxc.up.railway.app#%F0%9F%87%B3%F0%9F%87%B1%20Netherlands%202%20irancell", direct: true },
        "vless://8b75d9aa-bd15-11f1-a2c6-6fdb7335ecc7@104.20.18.167:443?path=%2Ffr4.vpnjantit.com%3A10002%2Fvpnjantit&security=tls&alpn=http%2F1.1&encryption=none&insecure=0&host=yes.docom47457.workers.dev&fp=chrome&type=ws&allowInsecure=0&sni=yes.docom47457.workers.dev#%F0%9F%87%AB%F0%9F%87%B7%20France%203"
      ],


  "5": [
        "vless://3eca1933-bb13-41ad-8f79-4c5a3ec8408d@104.20.18.167:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=lokepanel-production.up.railway.app%3A443%2Fws%2F3eca1933-bb13-41ad-8f79-4c5a3ec8408d#%F0%9F%87%B3%F0%9F%87%B1%20%20Netherlands%202",
        "vless://a83d1d62-b9ca-11f1-9b22-8fd0ffdf1be7@104.16.196.44:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=%2Fgr1.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%A9%F0%9F%87%AA%20Germany%202",
        "vless://cc90a816-bd15-11f1-916c-036d40a6fce0@104.16.111.127:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=it2.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%AE%F0%9F%87%B9%20Italy",
        "vless://493dc960-b9ca-11f1-a83b-5f404c0ad6eb@104.19.41.171:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=%2Fuk.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%AC%F0%9F%87%A7%20United%20Kingdom",
        "vless://2284a1da-b9cb-11f1-913f-6b282de802a2@104.16.181.106:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=%2Ffr2.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%AB%F0%9F%87%B7%20France%202",
        "vless://a86ebd42-bd15-11f1-b064-3bfcd301e16f@104.16.194.147:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=usa4.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%BA%F0%9F%87%B8%20United%20States%20south",
        "vless://8607bfb8-baab-11f1-8479-db6ba20a03e0@104.16.68.102:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=nl1.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%B3%F0%9F%87%B1%20%20Netherlands%201",
        "vless://4fd00864-b9cb-11f1-8009-37052120d486@104.16.67.219:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&type=ws&host=yes.docom47457.workers.dev&path=fr3.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%AB%F0%9F%87%B7%20France%205",
        "vless://5d256e9e-bd15-11f1-9ed7-b783395a2ec4@104.16.70.194:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=%2Ffr1.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%AB%F0%9F%87%B7%20France%204",
        "vless://1857488e-baac-11f1-9f2e-47f071967d2c@154.211.8.195:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=bg2.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%A7%F0%9F%87%AC%20Bulgaria",
        "vless://8e405a67-52a5-fc28-df7e-3c7f949d055f@104.16.68.102:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=%2Fkolgerpanel-production.up.railway.app%3A443%2Fws%2F8e405a67-52a5-fc28-df7e-3c7f949d055f#%F0%9F%87%BA%F0%9F%87%B8%20United%20States%20east%202",
        "vless://6a2aab0c-b9ca-11f1-a147-dfcc183c6810@172.66.44.200:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=%2Fse1.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%B8%F0%9F%87%AA%20Sweden",
        "vless://e8789a0a-b9ca-11f1-9ee4-77e65a81867a@172.66.44.200:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=fi1.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%AB%F0%9F%87%AE%20Finland%201",
        "vless://e16d2b72-baab-11f1-8962-d77f5dcebd3a@172.66.44.200:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=be1.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%A7%F0%9F%87%AA%20Belgium",
        "vless://8fc9f59c-b9cb-11f1-8f7b-27fd1e8193d1@104.16.66.15:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=%2Fcz2.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%A8%F0%9F%87%BF%20czech%20republic",
        "vless://07daa3fc-b9cb-11f1-998e-c7ff0f9c6cf2@104.16.102.15:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=fi2.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%AB%F0%9F%87%AE%20Finland%202",
        "vless://1428fdd2-bd15-11f1-89f7-67be7b63e65b@104.16.196.44:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=%2Fdk1.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%A9%F0%9F%87%B0%20Denmark",
        "vless://3b20d592-baac-11f1-b452-f37f3180a4b9@104.20.18.167:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=%2Flt1.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%B1%F0%9F%87%B9%20Lithuania",
        "vless://252b7d6a-b9ca-11f1-832a-5f6afcefb56f@172.67.163.166:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=safari&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=usa6.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%BA%F0%9F%87%B8%20United%20States%20east",
        "vless://567f263c-baab-11f1-a5f6-ef64def59790@104.16.68.102:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=nl4.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%B3%F0%9F%87%B1%20Netherlands%203",
        "vless://cce3d02a-b9ca-11f1-8fa7-b7aa2dd00e6a@104.16.102.15:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=%2Fgr2.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%A9%F0%9F%87%AA%20Germany%201",
        "vless://3c80097e-bd15-11f1-b4a2-0b8cc777ed37@172.66.44.200:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=%2Fee1.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%AA%F0%9F%87%AA%20Estonia%201",
        "vless://8b75d9aa-bd15-11f1-a2c6-6fdb7335ecc7@104.16.70.194:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=%2Ffr4.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%AB%F0%9F%87%B7%20France%203",
        "vless://b35cb664-bd5b-11f1-8a17-33764cc07f69@104.16.181.106:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=%2Fru3.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%B7%F0%9F%87%BA%20Russia"
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
                    "0",
                    "104",
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
                    "114",
                    "1"
                  ],

                delays:
                  ["1"],

                maxSplit:
                  "11"
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


// ============================================================
// Beta (SNI-style)
// ------------------------------------------------------------
// دقیقاً همان ساختاری که فایل SNI دارد:
//  - finalmask داخل خود streamSettings (نه outbound جدا و dialerProxy)
//  - SNI با حروف بزرگ/کوچک تصادفی، Host و path با حروف کوچک
//  - فقط یک outbound به نام proxy (بدون balancer)
//  - inbound فقط socks روی 127.0.0.1
//  - DNS + Routing کامل مثل فایل SNI
// ============================================================

const SNI_CIPHER_SUITES =
  "TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:" +
  "TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384:" +
  "TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256:" +
  "TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256:" +
  "TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA:" +
  "TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA256:TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256";

function randomizeCase(s) {
  const str = String(s || "");
  // آی‌پی یا رشته‌ی بدون حرف را دست نزن
  if (!/[a-z]/i.test(str) || /^[\d.:]+$/.test(str)) return str;
  return str
    .split("")
    .map((c) => (Math.random() < 0.5 ? c.toLowerCase() : c.toUpperCase()))
    .join("");
}

function buildSniOutbound(node, tag) {

  const hostLower = String(node.hostHeader || node.address).toLowerCase();
  const sniRaw = node.sni || node.hostHeader || node.address;

  return {
    mux: { concurrency: -1, enabled: false },
    protocol: "vless",
    settings: {
      address: node.address,
      encryption: "none",
      flow: "",
      id: node.uuid,
      port: node.port
    },
    streamSettings: {
      finalmask: {
        tcp: [
          {
            type: "fragment",
            settings: {
              packets: "tlshello",
              lengths: ["0", "104", "1"],
              delays: ["0"],
              maxSplit: "0"
            }
          },
          {
            type: "fragment",
            settings: {
              packets: "1-1",
              lengths: ["114", "1"],
              delays: ["1"],
              maxSplit: "11"
            }
          }
        ]
      },
      network: node.network,
      security: "tls",
      tlsSettings: {
        allowInsecure: false,
        alpn: node.alpn || ["http/1.1"],
        cipherSuites: SNI_CIPHER_SUITES,
        fingerprint: "unsafe",
        serverName: randomizeCase(sniRaw)
      },
      wsSettings: {
        host: hostLower,
        path: node.path || "/"
      }
    },
    tag
  };
}


// ============================================================
// Beta Load Balance
// ------------------------------------------------------------
// همان ساختار SNI/finalmask، ولی همهٔ سرورها داخل «یک» کانفیگ
// با balancer از نوع leastLoad + burstObservatory (هر ۳۰ ثانیه).
// ============================================================

function buildSniLoadBalanceConfig(nodes, remarks) {

  const vlessNodes = nodes.filter((n) => n.protocol === "vless");

  // اگر هیچ VLESS نبود، به روش قبلی برگرد
  if (!vlessNodes.length) {
    return buildFullConfig(nodes, { type: "finalMask", remarks });
  }

  // کانفیگ پایه (DNS، inbound، policy، routing) از همان ساختار SNI
  const cfg = buildSniConfig(vlessNodes[0], remarks);

  const proxies = vlessNodes.map((n, i) =>
    buildSniOutbound(n, `node-${i + 1}-${safeTag(n.tag)}`)
  );

  const nodeTags = proxies.map((o) => o.tag);

  // outboundهای جانبی (direct / block / dns-out) همان‌ها می‌مانند
  cfg.outbounds = [
    ...proxies,
    ...cfg.outbounds.filter((o) => o.tag !== "proxy")
  ];

  // هر rule که به "proxy" می‌رفت، حالا به balancer می‌رود
  cfg.routing.rules = cfg.routing.rules.map((r) => {
    if (r.outboundTag === "proxy") {
      const { outboundTag, ...rest } = r;
      return { ...rest, balancerTag: "auto" };
    }
    return r;
  });

  // قانون نهایی: بقیهٔ ترافیک socks → balancer
  cfg.routing.rules.push({
    type: "field",
    inboundTag: ["socks"],
    balancerTag: "auto"
  });

  cfg.routing.balancers = [
    {
      tag: "auto",
      selector: nodeTags,
      strategy: { type: "leastLoad" }
    }
  ];

  cfg.burstObservatory = {
    pingConfig: {
      connectivity: "http://connectivitycheck.platform.hicloud.com/generate_204",
      destination: "http://www.google.com/gen_204",
      interval: "5m",
      sampling: 5,
      timeout: "3s"
    },
    subjectSelector: nodeTags
  };

  return cfg;
}


function buildSniConfig(node, remarks) {

  // فقط VLESS؛ بقیه‌ی پروتکل‌ها مثل قبل ساخته می‌شوند
  if (node.protocol !== "vless") {
    return buildFullConfig([node], { type: "finalMask", remarks });
  }

  return {
    dns: {
      hosts: {
        "domain:googleapis.cn": "googleapis.com",
        "dns.alidns.com": ["223.5.5.5", "223.6.6.6", "2400:3200::1", "2400:3200:baba::1"],
        "dns.sse.cisco.com": ["208.67.220.220", "208.67.222.222", "2620:119:35::35", "2620:119:53::53"],
        "dns.umbrella.com": ["208.67.220.220", "208.67.222.222", "2620:119:35::35", "2620:119:53::53"],
        "one.one.one.one": ["1.1.1.1", "1.0.0.1", "2606:4700:4700::1111", "2606:4700:4700::1001"],
        "1dot1dot1dot1.cloudflare-dns.com": ["1.1.1.1", "1.0.0.1", "2606:4700:4700::1111", "2606:4700:4700::1001"],
        "dns.cloudflare.com": ["162.159.61.8", "172.64.41.8", "2a06:98c1:52::8", "2803:f800:53::8"],
        "cloudflare-dns.com": ["104.16.248.249", "104.16.249.249", "2606:4700::6810:f8f9", "2606:4700::6810:f9f9"],
        "engage.cloudflareclient.com": ["162.159.192.1", "2606:4700:d0::a29f:c001"],
        "doh.pub": ["1.12.12.12", "120.53.53.53"],
        "dot.pub": ["1.12.12.12", "120.53.53.53"],
        "dns.google": ["8.8.8.8", "8.8.4.4", "2001:4860:4860::8888", "2001:4860:4860::8844"],
        "dns.quad9.net": ["9.9.9.9", "149.112.112.112", "2620:fe::fe", "2620:fe::9"],
        "dns.sb": ["45.11.45.11", "185.222.222.222", "2a09::", "2a11::"],
        "common.dot.dns.yandex.net": ["77.88.8.8", "77.88.8.1", "2a02:6b8::feed:0ff", "2a02:6b8:0:1::feed:0ff"]
      },
      servers: [
        {
          address: "fakedns",
          domains: [
            "geosite:cn", "geosite:google", "geosite:private",
            "domain:alidns.com", "domain:doh.pub", "domain:dot.pub",
            "domain:360.cn", "domain:onedns.net", "geosite:cn"
          ]
        },
        "https://cloudflare-dns.com/dns-query",
        {
          address: "223.5.5.5",
          domains: ["geosite:cn"],
          expectIPs: ["geoip:cn"],
          finalQuery: true,
          skipFallback: true,
          tag: "domestic-dns_cn_expect_0"
        },
        {
          address: "https://cloudflare-dns.com/dns-query",
          domains: ["geosite:google"]
        },
        {
          address: "223.5.5.5",
          domains: ["geosite:private"],
          finalQuery: true,
          skipFallback: true,
          tag: "domestic-dns_1_0"
        },
        {
          address: "223.5.5.5",
          domains: ["domain:alidns.com", "domain:doh.pub", "domain:dot.pub", "domain:360.cn", "domain:onedns.net"],
          finalQuery: true,
          skipFallback: true,
          tag: "domestic-dns_2_0"
        },
        {
          address: "223.5.5.5",
          domains: ["geosite:cn"],
          finalQuery: true,
          skipFallback: true,
          tag: "domestic-dns_3_0"
        }
      ],
      tag: "dns-module"
    },

    inbounds: [
      {
        listen: "127.0.0.1",
        port: 10808,
        protocol: "socks",
        settings: { auth: "noauth", udp: true },
        sniffing: {
          destOverride: ["http", "tls", "quic", "fakedns"],
          enabled: true,
          routeOnly: false
        },
        tag: "socks"
      }
    ],

    log: { loglevel: "warning" },

    outbounds: [
      buildSniOutbound(node, "proxy"),
      { protocol: "freedom", tag: "direct" },
      { protocol: "blackhole", tag: "block" },
      { protocol: "dns", settings: { userLevel: 12 }, tag: "dns-out" }
    ],

    policy: {
      levels: {
        "0": { downlinkOnly: 0, uplinkOnly: 0 },
        "12": { connIdle: 12, downlinkOnly: 0, uplinkOnly: 0 }
      }
    },

    remarks,

    routing: {
      domainStrategy: "AsIs",
      rules: [
        { inboundTag: ["socks"], outboundTag: "dns-out", port: "53", type: "field" },
        {
          inboundTag: ["domestic-dns_1_0", "domestic-dns_2_0", "domestic-dns_3_0", "domestic-dns_cn_expect_0"],
          outboundTag: "direct",
          type: "field"
        },
        { inboundTag: ["dns-module"], outboundTag: "proxy", type: "field" },
        { network: "udp", outboundTag: "block", port: "443", type: "field" },
        { domain: ["geosite:google"], outboundTag: "proxy", type: "field" },
        { ip: ["ext:geoip-only-cn-private.dat:private"], outboundTag: "direct", type: "field" },
        { domain: ["geosite:private"], outboundTag: "direct", type: "field" },
        {
          ip: [
            "223.5.5.5", "223.6.6.6", "2400:3200::1", "2400:3200:baba::1",
            "119.29.29.29", "1.12.12.12", "120.53.53.53", "2402:4e00::", "2402:4e00:1::",
            "180.76.76.76", "2400:da00::6666", "114.114.114.114", "114.114.115.115",
            "114.114.114.119", "114.114.115.119", "114.114.114.110", "114.114.115.110",
            "180.184.1.1", "180.184.2.2", "101.226.4.6", "218.30.118.6", "123.125.81.6",
            "140.207.198.6", "1.2.4.8", "210.2.4.8", "52.80.66.66", "117.50.22.22",
            "2400:7fc0:849e:200::4", "2404:c2c0:85d8:901::4", "117.50.10.10", "52.80.52.52",
            "2400:7fc0:849e:200::8", "2404:c2c0:85d8:901::8", "117.50.60.30", "52.80.60.30"
          ],
          outboundTag: "direct",
          type: "field"
        },
        {
          domain: ["domain:alidns.com", "domain:doh.pub", "domain:dot.pub", "domain:360.cn", "domain:onedns.net"],
          outboundTag: "direct",
          type: "field"
        },
        { ip: ["ext:geoip-only-cn-private.dat:cn"], outboundTag: "direct", type: "field" },
        { domain: ["geosite:cn"], outboundTag: "direct", type: "field" }
      ]
    }
  };
}
