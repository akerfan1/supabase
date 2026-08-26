// Cloudflare Worker — Xray dynamic best-ping (every 30s) + Fragment + Beta (finalMask)
// Output: JSON array with three full configs
// Routes:
//   /?uuid=1            -> [ LoadBalance, Irancell (Fragment), Beta (finalMask) ]
//   /?uuid=1&view=sub   -> v2rayN/NG subscription (links base64; raw nodes)

Deno.serve(async (request) => {
  const url = new URL(request.url);
  const uuidKey = url.searchParams.get("uuid") || "";
  const view = (url.searchParams.get("view") || "").toLowerCase();

  if (!uuidKey) return new Response("Missing uuid", { status: 400 });

  const links = serverGroups[uuidKey];
  if (!links || !Array.isArray(links) || links.length === 0) {
    return new Response("Invalid uuid or empty group", { status: 404 });
  }

  // Parse links to nodes (support VLESS / Trojan / VMess)
  const nodes = links.map(parseLink).filter(Boolean);
  if (!nodes.length) return new Response("No valid nodes", { status: 422 });

  // Subscription view (raw links)
  if (view === "sub") {
    const b64 = toBase64Utf8(links.join("\n"));
    return new Response(b64, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  }

  // 1. Config LB (بهترین سرعت) - دست‌نخورده
  const configLB = buildFullConfig(nodes, { type: "none", remarks: "⚡best load {بهترین سرعت}⚡" });
  
  // 2. Config Irancell (فرگمنت معمولی) - دست‌نخورده
  const configFragment = buildFullConfig(nodes, { type: "fragment", remarks: "Irancell" });

  // 3. Config Beta (تنظیمات finalMask + cipherSuites + unsafe - با حفظ IP اصلی VLESS)
  const configBeta = buildFullConfig(nodes, { type: "finalMask", remarks: "Beta" });

  return new Response(JSON.stringify([configLB, configFragment, configBeta], null, 2), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
});

/* ================
   Server groups
   ================ */
const serverGroups = {
   "1": [
    // نمونه‌ها — لینک‌های خودت را بگذار
          "vless://14e28b36-9a4d-40a4-9aff-fb63163c74f4@104.16.72.162:443?encryption=none&security=tls&sni=test1200.erfanhub.ir&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=test1200.erfanhub.ir&path=%2Fpyip%3D178.156.139.174#1",
          "vless://9facaeda-08cb-4032-98ef-208c65c18027@104.18.152.249:443?encryption=none&security=tls&sni=urmy.erfanfamily2.ir&fp=chrome&alpn=http%2F1.1&type=ws&host=urmy.erfanfamily2.ir&path=%2Fvl%2F0LqYf21RNpzenuMzsU8d1JDVi%3Fed%3D2560#2",
          "vless://f1ebace6-6bf9-4fe8-8a42-5848975f52ea@104.18.152.249:443?encryption=none&security=tls&sni=fO9lJCOvpe4B394uDeO4g.pAGes.DEV&fp=chrome&alpn=http%2F1.1&ech=taskulu.com%2Budp%3A%2F%2F1.1.1.1&type=ws&host=fo9ljcovpe4b394udeo4g.pages.dev&path=%2Fvl%2FgaHIeQrRumXAaZfvi7NDb9sy%3Fed%3D2560#3",
          "vless://292032c7-15a3-4eaf-8d76-076c13832278@172.67.184.127:443?encryption=none&security=tls&sni=testu.erfanfamily.ir&fp=chrome&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=testu.erfanfamily.ir&path=%2Fvl%2FKIG6R8zHJxjnEPNXIeF7YLPOG9oN4%3Fed%3D2560#4",
          "vless://44a0e4f6-d0d5-439b-8f2e-b9730620d40e@104.27.119.28:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=yes.docom47457.workers.dev&path=ca5.taskflowhub.org%3A8443%2Frealtime#%F0%9F%87%A8%F0%9F%87%A6",
          "vless://8103e96c-9f79-11f1-84f5-6fe34b400539@172.67.184.127:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=%2Fie1.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%AE%F0%9F%87%AA%20Ireland",
          "vless://40299eba-9f78-11f1-96ff-5b700e0d34f2@172.67.184.127:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=%2Fnl1.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%B3%F0%9F%87%B1%20The%20Netherlands",
    // "vmess://<base64-json>"
  ],
  "2": [
          "vless://7850157b-2560-435e-9695-c8a76c30f31f@188.114.96.3:443?encryption=none&security=tls&sni=first.corw.ir&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=first.corw.ir&path=%2Fvl%2Fhn71UJzifNrP1a3UDm5mTmCS6hX1Gu%3Fed%3D2560#5",
          "vless://4199303a-8fd4-4e06-8799-7ccad9070671@104.21.74.63:443?encryption=none&security=tls&sni=tesr.erfanhub.ir&fp=chrome&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=tesr.erfanhub.ir&path=%2Fvl%2FUoGuCC2ItjAG6iE80ZSx%3Fed%3D2560#6",
          "vless://c43c59c6-5fdd-4109-8d8d-66578c026f02@104.20.18.167:443?encryption=none&security=tls&sni=IOWzj-QENl8R7zjVMU7klxdCtT2R.wOdiwOW334.WOrkerS.DEV&fp=chrome&alpn=http%2F1.1&insecure=0&allowInsecure=0&ech=taskulu.com%2Budp%3A%2F%2F1.1.1.1&type=ws&host=iowzj-qenl8r7zjvmu7klxdctt2r.wodiwow334.workers.dev&path=%2Fvl%2FCvYgbOvrFqG4ihZhsExQ%3Fed%3D2560#7",
          "vless://02b1ea62-173d-43df-a566-6f0f65536e23@45.67.215.67:443?encryption=none&security=tls&sni=hola.erfanfamily.ir&fp=chrome&ech=cloudflare-ech.com%2Bhttps%3A%2F%2F8.8.8.8%2Fdns-query&type=ws&host=hola.erfanfamily.ir&path=%2F%3Fed%3D2048#8",
          "vless://b585dc5e-55bf-4a8b-913a-27c9ccac05c3@104.21.74.63:443?encryption=none&security=tls&sni=joke.corw.ir&fp=chrome&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=joke.corw.ir&path=%2Fbab-6.site%3A443%2Fvws%2F#%F0%9F%87%AB%F0%9F%87%B7",
         "vless://924b826c-9f78-11f1-828b-7fe71eb40a64@172.67.184.127:443?encryption=none&security=tls&sni=joke.corw.ir&fp=chrome&alpn=http%2F1.1&type=ws&host=joke.corw.ir&path=%2Fusa8.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%BA%F0%9F%87%B8%20United%20States",
  ],
  "3": [
        "vless://14e28b36-9a4d-40a4-9aff-fb63163c74f4@172.64.229.36:443?encryption=none&security=tls&sni=test1200.erfanhub.ir&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=test1200.erfanhub.ir&path=%2Fpyip%3D178.156.139.174#8",
        "vless://14e28b36-9a4d-40a4-9aff-fb63163c74f4@104.16.72.162:443?encryption=none&security=tls&sni=test1200.erfanhub.ir&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=test1200.erfanhub.ir&path=%2Fpyip%3D178.156.139.174#1",
        "vless://9facaeda-08cb-4032-98ef-208c65c18027@104.18.152.249:443?encryption=none&security=tls&sni=urmy.erfanfamily2.ir&fp=chrome&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=urmy.erfanfamily2.ir&path=%2Fvl%2F0LqYf21RNpzenuMzsU8d1JDVi%3Fed%3D2560#2",
        "vless://02b1ea62-173d-43df-a566-6f0f65536e23@173.245.49.165:443?encryption=none&security=tls&sni=hawm.erfanfamily2.ir&fp=random&alpn=h3%2Ch2%2Chttp%2F1.1&insecure=0&allowInsecure=0&type=ws&host=hawm.erfanfamily2.ir&path=%2F%3Fed%3D2048#3",
        "vless://292032c7-15a3-4eaf-8d76-076c13832278@172.67.184.127:443?encryption=none&security=tls&sni=testu.erfanfamily.ir&fp=chrome&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=testu.erfanfamily.ir&path=%2Fvl%2FKIG6R8zHJxjnEPNXIeF7YLPOG9oN4%3Fed%3D2560#4",
        "vless://44a0e4f6-d0d5-439b-8f2e-b9730620d40e@104.27.119.28:443?encryption=none&security=tls&sni=lolsa.erfanfamily2.ir&fp=chrome&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=lolsa.erfanfamily2.ir&path=ca5.taskflowhub.org%3A8443%2Frealtime#%F0%9F%87%A8%F0%9F%87%A6",
        "vless://8103e96c-9f79-11f1-84f5-6fe34b400539@172.67.184.127:443?encryption=none&security=tls&sni=lolsa.erfanfamily2.ir&fp=chrome&alpn=http%2F1.1&type=ws&host=lolsa.erfanfamily2.ir&path=%2Fie1.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%AE%F0%9F%87%AA%20Ireland",
        "vless://40299eba-9f78-11f1-96ff-5b700e0d34f2@172.67.184.127:443?encryption=none&security=tls&sni=lolsa.erfanfamily2.ir&fp=chrome&alpn=http%2F1.1&type=ws&host=lolsa.erfanfamily2.ir&path=%2Fnl1.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%B3%F0%9F%87%B1%20The%20Netherlands",
        "vless://14e28b36-9a4d-40a4-9aff-fb63163c74f4@104.17.108.68:443?encryption=none&security=tls&sni=test1200.erfanhub.ir&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=test1200.erfanhub.ir&path=%2Fpyip%3D178.156.139.174#9",
        "vless://14e28b36-9a4d-40a4-9aff-fb63163c74f4@45.67.215.67:443?encryption=none&security=tls&sni=test1200.erfanhub.ir&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=test1200.erfanhub.ir&path=%2Fpyip%3D178.156.139.174#10",
        "vless://14e28b36-9a4d-40a4-9aff-fb63163c74f4@103.21.244.26:443?encryption=none&security=tls&sni=test1200.erfanhub.ir&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=test1200.erfanhub.ir&path=%2Fpyip%3D178.156.139.174#11",
        "vless://14e28b36-9a4d-40a4-9aff-fb63163c74f4@104.20.18.167:443?encryption=none&security=tls&sni=test1200.erfanhub.ir&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=test1200.erfanhub.ir&path=%2Fpyip%3D178.156.139.174#12",
        "vless://14e28b36-9a4d-40a4-9aff-fb63163c74f4@91.206.71.164:443?encryption=none&security=tls&sni=test1200.erfanhub.ir&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=test1200.erfanhub.ir&path=%2Fpyip%3D178.156.139.174#13",
        "vless://14e28b36-9a4d-40a4-9aff-fb63163c74f4@104.16.72.162:443?encryption=none&security=tls&sni=test1200.erfanhub.ir&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=test1200.erfanhub.ir&path=%2Fpyip%3D178.156.139.174#14",
        "vless://14e28b36-9a4d-40a4-9aff-fb63163c74f4@198.41.204.141:443?encryption=none&security=tls&sni=test1200.erfanhub.ir&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=test1200.erfanhub.ir&path=%2Fpyip%3D178.156.139.174#15",
        "vless://14e28b36-9a4d-40a4-9aff-fb63163c74f4@172.64.75.10:443?encryption=none&security=tls&sni=test1200.erfanhub.ir&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=test1200.erfanhub.ir&path=%2Fpyip%3D178.156.139.174#16",
        "vless://5f99fbcc-bac8-44f0-9f33-fcb9fecfd326@172.64.229.36:443?encryption=none&security=tls&sni=test5000.erfanfamily2.ir&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=test5000.erfanfamily2.ir&path=%2FeyJqdW5rIjoiRlV2bnBzS09yNVZLIiwicHJvdG9jb2wiOiJ2bCIsIm1vZGUiOiJwcm94eWlwIiwicGFuZWxJUHMiOltdfQ%3D%3D%3Fed%3D2560#17",
        "vless://5f99fbcc-bac8-44f0-9f33-fcb9fecfd326@104.17.108.68:443?encryption=none&security=tls&sni=test5000.erfanfamily2.ir&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=test5000.erfanfamily2.ir&path=%2FeyJqdW5rIjoiRlV2bnBzS09yNVZLIiwicHJvdG9jb2wiOiJ2bCIsIm1vZGUiOiJwcm94eWlwIiwicGFuZWxJUHMiOltdfQ%3D%3D%3Fed%3D2560#18",
        "vless://5f99fbcc-bac8-44f0-9f33-fcb9fecfd326@45.67.215.67:443?encryption=none&security=tls&sni=test5000.erfanfamily2.ir&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=test5000.erfanfamily2.ir&path=%2FeyJqdW5rIjoiRlV2bnBzS09yNVZLIiwicHJvdG9jb2wiOiJ2bCIsIm1vZGUiOiJwcm94eWlwIiwicGFuZWxJUHMiOltdfQ%3D%3D%3Fed%3D2560#19",
        "vless://5f99fbcc-bac8-44f0-9f33-fcb9fecfd326@103.21.244.26:443?encryption=none&security=tls&sni=test5000.erfanfamily2.ir&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=test5000.erfanfamily2.ir&path=%2FeyJqdW5rIjoiRlV2bnBzS09yNVZLIiwicHJvdG9jb2wiOiJ2bCIsIm1vZGUiOiJwcm94eWlwIiwicGFuZWxJUHMiOltdfQ%3D%3D%3Fed%3D2560#20",
        "vless://5f99fbcc-bac8-44f0-9f33-fcb9fecfd326@104.20.18.167:443?encryption=none&security=tls&sni=test5000.erfanfamily2.ir&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=test5000.erfanfamily2.ir&path=%2FeyJqdW5rIjoiRlV2bnBzS09yNVZLIiwicHJvdG9jb2wiOiJ2bCIsIm1vZGUiOiJwcm94eWlwIiwicGFuZWxJUHMiOltdfQ%3D%3D%3Fed%3D2560#21",
        "vless://5f99fbcc-bac8-44f0-9f33-fcb9fecfd326@91.206.71.164:443?encryption=none&security=tls&sni=test5000.erfanfamily2.ir&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=test5000.erfanfamily2.ir&path=%2FeyJqdW5rIjoiRlV2bnBzS09yNVZLIiwicHJvdG9jb2wiOiJ2bCIsIm1vZGUiOiJwcm94eWlwIiwicGFuZWxJUHMiOltdfQ%3D%3D%3Fed%3D2560#22",
        "vless://5f99fbcc-bac8-44f0-9f33-fcb9fecfd326@104.16.72.162:443?encryption=none&security=tls&sni=test5000.erfanfamily2.ir&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=test5000.erfanfamily2.ir&path=%2FeyJqdW5rIjoiRlV2bnBzS09yNVZLIiwicHJvdG9jb2wiOiJ2bCIsIm1vZGUiOiJwcm94eWlwIiwicGFuZWxJUHMiOltdfQ%3D%3D%3Fed%3D2560#23",
        "vless://5f99fbcc-bac8-44f0-9f33-fcb9fecfd326@198.41.204.141:443?encryption=none&security=tls&sni=test5000.erfanfamily2.ir&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=test5000.erfanfamily2.ir&path=%2FeyJqdW5rIjoiRlV2bnBzS09yNVZLIiwicHJvdG9jb2wiOiJ2bCIsIm1vZGUiOiJwcm94eWlwIiwicGFuZWxJUHMiOltdfQ%3D%3D%3Fed%3D2560#24",
        "vless://5f99fbcc-bac8-44f0-9f33-fcb9fecfd326@172.64.75.10:443?encryption=none&security=tls&sni=test5000.erfanfamily2.ir&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=test5000.erfanfamily2.ir&path=%2FeyJqdW5rIjoiRlV2bnBzS09yNVZLIiwicHJvdG9jb2wiOiJ2bCIsIm1vZGUiOiJwcm94eWlwIiwicGFuZWxJUHMiOltdfQ%3D%3D%3Fed%3D2560#25",
        "vless://02b1ea62-173d-43df-a566-6f0f65536e23@172.64.229.36:443?encryption=none&security=tls&sni=hawm.erfanfamily2.ir&fp=random&alpn=h3%2Ch2%2Chttp%2F1.1&insecure=0&allowInsecure=0&type=ws&host=hawm.erfanfamily2.ir&path=%2F%3Fed%3D2048#26",
        "vless://02b1ea62-173d-43df-a566-6f0f65536e23@104.17.108.68:443?encryption=none&security=tls&sni=hawm.erfanfamily2.ir&fp=random&alpn=h3%2Ch2%2Chttp%2F1.1&insecure=0&allowInsecure=0&type=ws&host=hawm.erfanfamily2.ir&path=%2F%3Fed%3D2048#27",
        "vless://02b1ea62-173d-43df-a566-6f0f65536e23@45.67.215.67:443?encryption=none&security=tls&sni=hawm.erfanfamily2.ir&fp=random&alpn=h3%2Ch2%2Chttp%2F1.1&insecure=0&allowInsecure=0&type=ws&host=hawm.erfanfamily2.ir&path=%2F%3Fed%3D2048#28",
        "vless://02b1ea62-173d-43df-a566-6f0f65536e23@103.21.244.26:443?encryption=none&security=tls&sni=hawm.erfanfamily2.ir&fp=random&alpn=h3%2Ch2%2Chttp%2F1.1&insecure=0&allowInsecure=0&type=ws&host=hawm.erfanfamily2.ir&path=%2F%3Fed%3D2048#29",
        "vless://02b1ea62-173d-43df-a566-6f0f65536e23@104.20.18.167:443?encryption=none&security=tls&sni=hawm.erfanfamily2.ir&fp=random&alpn=h3%2Ch2%2Chttp%2F1.1&insecure=0&allowInsecure=0&type=ws&host=hawm.erfanfamily2.ir&path=%2F%3Fed%3D2048#30",
        "vless://02b1ea62-173d-43df-a566-6f0f65536e23@91.206.71.164:443?encryption=none&security=tls&sni=hawm.erfanfamily2.ir&fp=random&alpn=h3%2Ch2%2Chttp%2F1.1&insecure=0&allowInsecure=0&type=ws&host=hawm.erfanfamily2.ir&path=%2F%3Fed%3D2048#31",
        "vless://02b1ea62-173d-43df-a566-6f0f65536e23@104.16.72.162:443?encryption=none&security=tls&sni=hawm.erfanfamily2.ir&fp=random&alpn=h3%2Ch2%2Chttp%2F1.1&insecure=0&allowInsecure=0&type=ws&host=hawm.erfanfamily2.ir&path=%2F%3Fed%3D2048#32",
        "vless://02b1ea62-173d-43df-a566-6f0f65536e23@198.41.204.141:443?encryption=none&security=tls&sni=hawm.erfanfamily2.ir&fp=random&alpn=h3%2Ch2%2Chttp%2F1.1&insecure=0&allowInsecure=0&type=ws&host=hawm.erfanfamily2.ir&path=%2F%3Fed%3D2048#33",
        "vless://02b1ea62-173d-43df-a566-6f0f65536e23@172.64.75.10:443?encryption=none&security=tls&sni=hawm.erfanfamily2.ir&fp=random&alpn=h3%2Ch2%2Chttp%2F1.1&insecure=0&allowInsecure=0&type=ws&host=hawm.erfanfamily2.ir&path=%2F%3Fed%3D2048#34",
        "vless://14371dd4-9ba9-4e3a-88ad-b1eb9569f154@172.64.229.36:443?encryption=none&security=tls&sni=dJt8n4DkF87z6QD1Wy6S.RiDAm68232.worKErS.dEv&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=djt8n4dkf87z6qd1wy6s.ridam68232.workers.dev&path=%2Fvl%2FJpMMgNI2wq0KfjVL7cga%3Fed%3D2560#35",
        "vless://14371dd4-9ba9-4e3a-88ad-b1eb9569f154@104.17.108.68:443?encryption=none&security=tls&sni=dJt8n4DkF87z6QD1Wy6S.RiDAm68232.worKErS.dEv&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=djt8n4dkf87z6qd1wy6s.ridam68232.workers.dev&path=%2Fvl%2FJpMMgNI2wq0KfjVL7cga%3Fed%3D2560#36",
        "vless://14371dd4-9ba9-4e3a-88ad-b1eb9569f154@45.67.215.67:443?encryption=none&security=tls&sni=dJt8n4DkF87z6QD1Wy6S.RiDAm68232.worKErS.dEv&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=djt8n4dkf87z6qd1wy6s.ridam68232.workers.dev&path=%2Fvl%2FJpMMgNI2wq0KfjVL7cga%3Fed%3D2560#37",
        "vless://14371dd4-9ba9-4e3a-88ad-b1eb9569f154@103.21.244.26:443?encryption=none&security=tls&sni=dJt8n4DkF87z6QD1Wy6S.RiDAm68232.worKErS.dEv&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=djt8n4dkf87z6qd1wy6s.ridam68232.workers.dev&path=%2Fvl%2FJpMMgNI2wq0KfjVL7cga%3Fed%3D2560#38",
        "vless://14371dd4-9ba9-4e3a-88ad-b1eb9569f154@104.20.18.167:443?encryption=none&security=tls&sni=dJt8n4DkF87z6QD1Wy6S.RiDAm68232.worKErS.dEv&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=djt8n4dkf87z6qd1wy6s.ridam68232.workers.dev&path=%2Fvl%2FJpMMgNI2wq0KfjVL7cga%3Fed%3D2560#39",
        "vless://14371dd4-9ba9-4e3a-88ad-b1eb9569f154@91.206.71.164:443?encryption=none&security=tls&sni=dJt8n4DkF87z6QD1Wy6S.RiDAm68232.worKErS.dEv&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=djt8n4dkf87z6qd1wy6s.ridam68232.workers.dev&path=%2Fvl%2FJpMMgNI2wq0KfjVL7cga%3Fed%3D2560#40",
        "vless://14371dd4-9ba9-4e3a-88ad-b1eb9569f154@104.16.72.162:443?encryption=none&security=tls&sni=dJt8n4DkF87z6QD1Wy6S.RiDAm68232.worKErS.dEv&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=djt8n4dkf87z6qd1wy6s.ridam68232.workers.dev&path=%2Fvl%2FJpMMgNI2wq0KfjVL7cga%3Fed%3D2560#41",
        "vless://14371dd4-9ba9-4e3a-88ad-b1eb9569f154@198.41.204.141:443?encryption=none&security=tls&sni=dJt8n4DkF87z6QD1Wy6S.RiDAm68232.worKErS.dEv&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=djt8n4dkf87z6qd1wy6s.ridam68232.workers.dev&path=%2Fvl%2FJpMMgNI2wq0KfjVL7cga%3Fed%3D2560#42",
        "vless://14371dd4-9ba9-4e3a-88ad-b1eb9569f154@172.64.75.10:443?encryption=none&security=tls&sni=dJt8n4DkF87z6QD1Wy6S.RiDAm68232.worKErS.dEv&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=djt8n4dkf87z6qd1wy6s.ridam68232.workers.dev&path=%2Fvl%2FJpMMgNI2wq0KfjVL7cga%3Fed%3D2560#43"
  ],
  "4": [
        "vless://0b6f55ce-2c36-453c-899c-89afcb2d7b6e@104.16.75.207:443?encryption=none&security=tls&sni=nalam.erfnmndi474.workers.dev&fp=random&insecure=0&allowInsecure=0&type=ws&host=nalam.erfnmndi474.workers.dev&path=%2Fgateway#8",
        "vless://0b6f55ce-2c36-453c-899c-89afcb2d7b6e@104.18.152.249:443?encryption=none&security=tls&sni=nalam.erfnmndi474.workers.dev&fp=random&insecure=0&allowInsecure=0&type=ws&host=nalam.erfnmndi474.workers.dev&path=%2Fgateway#9",
        "vless://0b6f55ce-2c36-453c-899c-89afcb2d7b6e@104.18.152.101:443?encryption=none&security=tls&sni=nalam.erfnmndi474.workers.dev&fp=random&insecure=0&allowInsecure=0&type=ws&host=nalam.erfnmndi474.workers.dev&path=%2Fgateway#10",
        "vless://0b6f55ce-2c36-453c-899c-89afcb2d7b6e@104.18.152.44:443?encryption=none&security=tls&sni=nalam.erfnmndi474.workers.dev&fp=random&insecure=0&allowInsecure=0&type=ws&host=nalam.erfnmndi474.workers.dev&path=%2Fgateway#11",
        "vless://7850157b-2560-435e-9695-c8a76c30f31f@188.114.96.3:443?encryption=none&security=tls&sni=first.corw.ir&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=first.corw.ir&path=%2Fvl%2Fhn71UJzifNrP1a3UDm5mTmCS6hX1Gu%3Fed%3D2560#5",
        "vless://4199303a-8fd4-4e06-8799-7ccad9070671@104.21.74.63:443?encryption=none&security=tls&sni=tesr.erfanhub.ir&fp=chrome&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=tesr.erfanhub.ir&path=%2Fvl%2FUoGuCC2ItjAG6iE80ZSx%3Fed%3D2560#6",
        "vless://c43c59c6-5fdd-4109-8d8d-66578c026f02@104.20.18.167:443?encryption=none&security=tls&sni=IOWzj-QENl8R7zjVMU7klxdCtT2R.wOdiwOW334.WOrkerS.DEV&fp=chrome&alpn=http%2F1.1&insecure=0&allowInsecure=0&ech=taskulu.com%2Budp%3A%2F%2F1.1.1.1&type=ws&host=iowzj-qenl8r7zjvmu7klxdctt2r.wodiwow334.workers.dev&path=%2Fvl%2FCvYgbOvrFqG4ihZhsExQ%3Fed%3D2560#7",
        "vless://f1ebace6-6bf9-4fe8-8a42-5848975f52ea@45.67.215.67:443?encryption=none&security=tls&sni=fO9lJCOvpe4B394uDeO4g.pAGes.DEV&fp=chrome&alpn=http%2F1.1&insecure=0&allowInsecure=0&ech=taskulu.com%2Budp%3A%2F%2F1.1.1.1&type=ws&host=fo9ljcovpe4b394udeo4g.pages.dev&path=%2Fvl%2FgaHIeQrRumXAaZfvi7NDb9sy%3Fed%3D2560#8",
        "vless://b585dc5e-55bf-4a8b-913a-27c9ccac05c3@104.21.74.63:443?encryption=none&security=tls&sni=joke.corw.ir&fp=chrome&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=joke.corw.ir&path=%2Fbab-6.site%3A443%2Fvws%2F#%F0%9F%87%AB%F0%9F%87%B7",
        "vless://924b826c-9f78-11f1-828b-7fe71eb40a64@172.67.184.127:443?encryption=none&security=tls&sni=lolsa.erfanfamily2.ir&fp=chrome&alpn=http%2F1.1&type=ws&host=lolsa.erfanfamily2.ir&path=%2Fusa8.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%BA%F0%9F%87%B8%20United%20States",
        "vless://0b6f55ce-2c36-453c-899c-89afcb2d7b6e@104.18.152.216:443?encryption=none&security=tls&sni=nalam.erfnmndi474.workers.dev&fp=random&insecure=0&allowInsecure=0&type=ws&host=nalam.erfnmndi474.workers.dev&path=%2Fgateway#12",
        "vless://0b6f55ce-2c36-453c-899c-89afcb2d7b6e@104.18.152.197:443?encryption=none&security=tls&sni=nalam.erfnmndi474.workers.dev&fp=random&insecure=0&allowInsecure=0&type=ws&host=nalam.erfnmndi474.workers.dev&path=%2Fgateway#13",
        "vless://0b6f55ce-2c36-453c-899c-89afcb2d7b6e@104.16.73.199:443?encryption=none&security=tls&sni=nalam.erfnmndi474.workers.dev&fp=random&insecure=0&allowInsecure=0&type=ws&host=nalam.erfnmndi474.workers.dev&path=%2Fgateway#14",
        "vless://0b6f55ce-2c36-453c-899c-89afcb2d7b6e@104.16.73.225:443?encryption=none&security=tls&sni=nalam.erfnmndi474.workers.dev&fp=random&insecure=0&allowInsecure=0&type=ws&host=nalam.erfnmndi474.workers.dev&path=%2Fgateway#15",
        "vless://b56b8e9c-b338-4d42-87c0-35ce808f41eb@104.16.75.207:8443?encryption=none&security=tls&sni=gorbahh.erfanhub.ir&fp=random&insecure=0&allowInsecure=0&type=ws&host=gorbahh.erfanhub.ir&path=%2Fproxyip%3D23.94.103.194#16",
        "vless://b56b8e9c-b338-4d42-87c0-35ce808f41eb@104.18.152.249:8443?encryption=none&security=tls&sni=gorbahh.erfanhub.ir&fp=random&insecure=0&allowInsecure=0&type=ws&host=gorbahh.erfanhub.ir&path=%2Fproxyip%3D23.94.103.194#17",
        "vless://b56b8e9c-b338-4d42-87c0-35ce808f41eb@104.18.152.101:8443?encryption=none&security=tls&sni=gorbahh.erfanhub.ir&fp=random&insecure=0&allowInsecure=0&type=ws&host=gorbahh.erfanhub.ir&path=%2Fproxyip%3D23.94.103.194#18",
        "vless://b56b8e9c-b338-4d42-87c0-35ce808f41eb@104.18.152.44:8443?encryption=none&security=tls&sni=gorbahh.erfanhub.ir&fp=random&insecure=0&allowInsecure=0&type=ws&host=gorbahh.erfanhub.ir&path=%2Fproxyip%3D23.94.103.194#19",
        "vless://b56b8e9c-b338-4d42-87c0-35ce808f41eb@104.18.152.216:8443?encryption=none&security=tls&sni=gorbahh.erfanhub.ir&fp=random&insecure=0&allowInsecure=0&type=ws&host=gorbahh.erfanhub.ir&path=%2Fproxyip%3D23.94.103.194#20",
        "vless://b56b8e9c-b338-4d42-87c0-35ce808f41eb@104.18.152.197:8443?encryption=none&security=tls&sni=gorbahh.erfanhub.ir&fp=random&insecure=0&allowInsecure=0&type=ws&host=gorbahh.erfanhub.ir&path=%2Fproxyip%3D23.94.103.194#21",
        "vless://b56b8e9c-b338-4d42-87c0-35ce808f41eb@104.16.73.199:8443?encryption=none&security=tls&sni=gorbahh.erfanhub.ir&fp=random&insecure=0&allowInsecure=0&type=ws&host=gorbahh.erfanhub.ir&path=%2Fproxyip%3D23.94.103.194#22",
        "vless://b56b8e9c-b338-4d42-87c0-35ce808f41eb@104.16.73.225:8443?encryption=none&security=tls&sni=gorbahh.erfanhub.ir&fp=random&insecure=0&allowInsecure=0&type=ws&host=gorbahh.erfanhub.ir&path=%2Fproxyip%3D23.94.103.194#23",
        "vless://a08bcfa1-f3b2-44f2-8899-d19ea09fe9d2@104.16.75.207:443?encryption=none&security=tls&sni=NuJ-VdqKRjD716Kg0CVB20.ErfnmnDI474.WoRkErs.Dev&fp=chrome&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=nuj-vdqkrjd716kg0cvb20.erfnmndi474.workers.dev&path=%2Fvl%2FHkFiKqHSWqoacZM7R0daqmO%3Fed%3D2560#24",
        "vless://a08bcfa1-f3b2-44f2-8899-d19ea09fe9d2@104.18.152.249:443?encryption=none&security=tls&sni=NuJ-VdqKRjD716Kg0CVB20.ErfnmnDI474.WoRkErs.Dev&fp=chrome&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=nuj-vdqkrjd716kg0cvb20.erfnmndi474.workers.dev&path=%2Fvl%2FHkFiKqHSWqoacZM7R0daqmO%3Fed%3D2560#25",
        "vless://a08bcfa1-f3b2-44f2-8899-d19ea09fe9d2@104.18.152.101:443?encryption=none&security=tls&sni=NuJ-VdqKRjD716Kg0CVB20.ErfnmnDI474.WoRkErs.Dev&fp=chrome&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=nuj-vdqkrjd716kg0cvb20.erfnmndi474.workers.dev&path=%2Fvl%2FHkFiKqHSWqoacZM7R0daqmO%3Fed%3D2560#26",
        "vless://a08bcfa1-f3b2-44f2-8899-d19ea09fe9d2@104.18.152.44:443?encryption=none&security=tls&sni=NuJ-VdqKRjD716Kg0CVB20.ErfnmnDI474.WoRkErs.Dev&fp=chrome&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=nuj-vdqkrjd716kg0cvb20.erfnmndi474.workers.dev&path=%2Fvl%2FHkFiKqHSWqoacZM7R0daqmO%3Fed%3D2560#27",
        "vless://a08bcfa1-f3b2-44f2-8899-d19ea09fe9d2@104.18.152.216:443?encryption=none&security=tls&sni=NuJ-VdqKRjD716Kg0CVB20.ErfnmnDI474.WoRkErs.Dev&fp=chrome&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=nuj-vdqkrjd716kg0cvb20.erfnmndi474.workers.dev&path=%2Fvl%2FHkFiKqHSWqoacZM7R0daqmO%3Fed%3D2560#28",
        "vless://a08bcfa1-f3b2-44f2-8899-d19ea09fe9d2@104.18.152.197:443?encryption=none&security=tls&sni=NuJ-VdqKRjD716Kg0CVB20.ErfnmnDI474.WoRkErs.Dev&fp=chrome&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=nuj-vdqkrjd716kg0cvb20.erfnmndi474.workers.dev&path=%2Fvl%2FHkFiKqHSWqoacZM7R0daqmO%3Fed%3D2560#29",
        "vless://a08bcfa1-f3b2-44f2-8899-d19ea09fe9d2@104.16.73.199:443?encryption=none&security=tls&sni=NuJ-VdqKRjD716Kg0CVB20.ErfnmnDI474.WoRkErs.Dev&fp=chrome&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=nuj-vdqkrjd716kg0cvb20.erfnmndi474.workers.dev&path=%2Fvl%2FHkFiKqHSWqoacZM7R0daqmO%3Fed%3D2560#30",
        "vless://a08bcfa1-f3b2-44f2-8899-d19ea09fe9d2@104.16.73.225:443?encryption=none&security=tls&sni=NuJ-VdqKRjD716Kg0CVB20.ErfnmnDI474.WoRkErs.Dev&fp=chrome&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=nuj-vdqkrjd716kg0cvb20.erfnmndi474.workers.dev&path=%2Fvl%2FHkFiKqHSWqoacZM7R0daqmO%3Fed%3D2560#31"
  ],
  "5": [
      "vless://d051c366-9f76-11f1-b2ed-00163cbe6c97@104.27.119.28:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&type=ws&host=yes.docom47457.workers.dev&path=bh2.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%A7%F0%9F%87%AD%20Bahrain",
        "vless://6eca06e0-a12d-11f1-a184-dfeaacfbd75e@172.67.184.127:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=ca1.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%A8%F0%9F%87%A6%20canada",
        "vless://de3898d2-9f77-11f1-8956-2318126adb8d@172.67.184.127:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=%2Ffi2.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%AB%F0%9F%87%AE%20Finland",
        "vless://fa14adac-9f77-11f1-9e7e-1b22ee9887cf@172.67.184.127:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&ech=cloudflare-ech.com%2Bhttps%3A%2F%2F8.8.8.8%2Fdns-query&type=ws&host=yes.docom47457.workers.dev&path=%2Ffr1.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%AB%F0%9F%87%B7%20France",
        "vless://747d526a-9f78-11f1-8a65-934e45043673@172.67.184.127:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=%2Fuk3.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%AC%F0%9F%87%A7%20United%20Kingdom",
        "vless://8103e96c-9f79-11f1-84f5-6fe34b400539@172.67.184.127:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=%2Fie1.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%AE%F0%9F%87%AA%20Ireland",
        "vless://1c9dc0fc-9f78-11f1-8481-cf797ee54d81@173.245.49.165:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=%2Fit1.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%AE%F0%9F%87%B9%20Italy",
        "vless://3944d59c-9f78-11f1-842f-df069ac68665@172.67.184.127:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=%2Flt1.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%B1%F0%9F%87%B9%20Lithuania",
        "vless://40299eba-9f78-11f1-96ff-5b700e0d34f2@173.245.49.165:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=%2Fnl1.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%B3%F0%9F%87%B1%20The%20Netherlands",
        "vless://924b826c-9f78-11f1-828b-7fe71eb40a64@104.16.72.162:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&fp=chrome&alpn=http%2F1.1&type=ws&host=yes.docom47457.workers.dev&path=%2Fusa8.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%BA%F0%9F%87%B8%20United%20States",
        "vless://93c7bf90-a13d-11f1-8c79-52ac0074670e@172.67.184.127:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&type=ws&host=yes.docom47457.workers.dev&path=premiusa3.vpnjantit.com%3A10002%2Fvpnjantit#%F0%9F%87%BA%F0%9F%87%B8%20United%20States%202",
       "vless://95058d12-a172-11f1-82a0-77d4f234c5eb@172.67.184.127:443?encryption=none&security=tls&sni=yes.docom47457.workers.dev&type=ws&host=yes.docom47457.workers.dev&path=gr1.vpnjantit.com%3A10002%2Fvpnjantit#%20%F0%9F%87%A9%F0%9F%87%AA%20germany%20",
  ]
};

/* ================
   Helpers
   ================ */
function toBase64Utf8(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function safeTag(s) {
  return (s || "")
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9._-]/g, "")
    .slice(0, 48) || "node";
}

function parseLink(link) {
  if (typeof link !== "string") return null;

  if (link.startsWith("vmess://")) {
    try {
      const b64 = link.slice(8).trim();
      const json = JSON.parse(decodeBase64ToUtf8(b64));
      const tag = json.ps || "vmess";
      return {
        _raw: link,
        protocol: "vmess",
        tag,
        address: json.add || json.address,
        port: Number(json.port || 443),
        uuid: json.id,
        alterId: Number(json.aid || 0),
        security: json.tls === "tls" ? "tls" : "none",
        sni: json.sni || json.host || json.add,
        alpn: json.alpn ? [].concat(json.alpn) : ["http/1.1"],
        path: json.path || "/",
        hostHeader: json.host || json.add,
        network: json.net || "tcp",
        fp: json.fp || "randomized"
      };
    } catch {
      return null;
    }
  }

  try {
    const u = new URL(link);
    const proto = u.protocol.replace(":", "");
    const tag = decodeURIComponent(u.hash.replace(/^#/, "")) || proto;
    const host = u.hostname;
    const port = Number(u.port || "443");
    const p = u.searchParams;

    if (proto === "vless") {
      return {
        _raw: link,
        protocol: "vless",
        tag,
        address: host,
        port,
        uuid: u.username,
        security: p.get("security") || "none",
        sni: p.get("sni") || host,
        fp: p.get("fp") || "randomized",
        alpn: (p.get("alpn") || "http/1.1").split(","),
        path: p.get("path") || "/",
        hostHeader: p.get("host") || host,
        network: p.get("type") || "tcp",
        ech: p.get("ech")
      };
    }
    if (proto === "trojan") {
      return {
        _raw: link,
        protocol: "trojan",
        tag,
        address: host,
        port,
        password: u.username,
        security: p.get("security") || "tls",
        sni: p.get("sni") || host,
        path: p.get("path") || "/",
        hostHeader: p.get("host") || host,
        network: p.get("type") || "tcp",
        ech: p.get("ech")
      };
    }
  } catch {
    return null;
  }
  return null;
}

function decodeBase64ToUtf8(b64) {
  b64 = b64.replace(/\s+/g, "");
  const pad = b64.length % 4;
  if (pad) b64 += "=".repeat(4 - pad);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/* ================
   Builders
   ================ */
function buildOutbound(node, idx, mode) {
  const t = safeTag(node.tag);
  const tag = `node-${idx}-${t}`;

  const base = {
    tag,
    protocol: node.protocol,
    streamSettings: buildStream(node, mode)
  };

  if (node.protocol === "vless") {
    base.settings = {
      vnext: [
        {
          address: node.address, // حفظ آی‌پی اصلی VLESS
          port: node.port,
          users: [{ id: node.uuid, encryption: "none", level: 8 }]
        }
      ]
    };
  } else if (node.protocol === "trojan") {
    base.settings = {
      servers: [{ address: node.address, port: node.port, password: node.password, level: 8 }]
    };
  } else if (node.protocol === "vmess") {
    base.settings = {
      vnext: [
        {
          address: node.address,
          port: node.port,
          users: [{ id: node.uuid, alterId: node.alterId || 0, security: "auto" }]
        }
      ]
    };
  }
  return base;
}

function buildStream(node, mode) {
  const s = {
    network: node.network,
    security: node.security === "tls" ? "tls" : "",
    sockopt: { domainStrategy: "UseIPv4v6" }
  };

  if (node.security === "tls") {
    s.tlsSettings = {
      allowInsecure: false,
      fingerprint: mode === "finalMask" ? "unsafe" : (node.fp || "randomized"),
      alpn: node.alpn || ["http/1.1"],
      serverName: node.sni || node.address
    };

    // افزودن CipherSuites مخصوص کانفیگ Beta
    if (mode === "finalMask") {
      s.tlsSettings.cipherSuites = "TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA256:TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256";
    }

    if (node.ech) {
      s.tlsSettings.echSettings = {
        enable: true,
        config: node.ech
      };
    }
  }
  
  if (node.network === "ws") {
    s.wsSettings = { path: node.path || "/", headers: { Host: node.hostHeader || node.address } };
  }

  if (mode === "fragment") {
    s.sockopt.dialerProxy = "fragment";
  } else if (mode === "finalMask") {
    s.sockopt.dialerProxy = "finalMask";
  }

  return s;
}

function buildFullConfig(nodes, options) {
  const { type, remarks } = options;
  const outbounds = nodes.map((n, i) => buildOutbound(n, i + 1, type));
  const nodeTags = outbounds.map(o => o.tag);

  if (type === "fragment") {
    outbounds.push({
      tag: "fragment",
      protocol: "freedom",
      settings: {
        fragment: { packets: "tlshello", length: "1", interval: "0" },
        domainStrategy: "UseIPv4v6"
      }
    });
  } else if (type === "finalMask") {
    outbounds.push({
      tag: "finalMask",
      protocol: "freedom",
      settings: {
        domainStrategy: "UseIPv4v6",
        finalMask: {
          tcp: [
            {
              type: "fragment",
              settings: {
                packets: "tlshello",
                lengths: ["5", "94", "1"],
                delays: ["0"],
                maxSplit: "0"
              }
            },
            {
              type: "fragment",
              settings: {
                packets: "1-1",
                lengths: ["109", "1"],
                delays: ["1"],
                maxSplit: "355"
              }
            }
          ]
        }
      }
    });
  }

  outbounds.push({ protocol: "dns", tag: "dns-out" });
  outbounds.push({ protocol: "freedom", tag: "direct", settings: { domainStrategy: "UseIP" } });
  outbounds.push({ protocol: "blackhole", tag: "block", settings: { response: { type: "http" } } });

  const cfg = {
    remarks: remarks,
    log: { loglevel: "warning" },

    dns: {
      hosts: {
        "domain:googleapis.cn": "googleapis.com"
      },
      servers: ["1.1.1.1"]
    },

    inbounds: [
      {
        tag: "socks-in",
        port: 10808,
        listen: "0.0.0.0",
        protocol: "socks",
        settings: { auth: "noauth", udp: true, userLevel: 8 },
        sniffing: { enabled: true, routeOnly: true, destOverride: ["http", "tls"] }
      },
      {
        tag: "http",
        port: 10809,
        listen: "0.0.0.0",
        protocol: "http",
        sniffing: {
          enabled: true,
          destOverride: ["http", "tls"],
          routeOnly: false
        },
        settings: {
          auth: "noauth",
          udp: true,
          allowTransparent: false
        }
      },
      {
        tag: "dns-in",
        port: 10853,
        protocol: "dokodemo-door",
        settings: { address: "1.1.1.1", network: "tcp,udp", port: 53 }
      },
      {
        tag: "api",
        port: 10813,
        listen: "127.0.0.1",
        protocol: "dokodemo-door",
        settings: {
          udp: false,
          address: "127.0.0.1",
          allowTransparent: false
        }
      }
    ],

    outbounds,

    policy: {
      levels: { "8": { connIdle: 300, downlinkOnly: 1, handshake: 4, uplinkOnly: 1 } },
      system: { statsOutboundUplink: true, statsOutboundDownlink: true }
    },

  routing: {
  domainStrategy: "IPIfNonMatch",
  domainMatcher: "hybrid",

  rules: [
    {
      type: "field",
      inboundTag: ["socks-in", "http"],
      balancerTag: "auto"
    }
  ],

  balancers: [
    {
      tag: "auto",
      selector: nodeTags,

      // انتخاب بر اساس وضعیت واقعی outboundها
      strategy: {
        type: "leastLoad"
      }
    }
  ]
},

stats: {},

api: {
  tag: "api",
  services: ["StatsService"]
},

// ================================
// Fast Observatory
// ================================
// تست سریع‌تر و منظم‌تر سرورها
burstObservatory: {
  pingConfig: {
    // آدرس سبک برای تست اتصال
    connectivity: "http://connectivitycheck.platform.hicloud.com/generate_204",

    // مقصد اصلی برای اندازه‌گیری تأخیر
    destination: "http://www.google.com/gen_204",

    // هر 30 ثانیه دوباره بررسی شود
    interval: "30s",

    // برای هر دوره چند نمونه گرفته شود
    sampling: 5,

    // سرورهای خیلی کند/قطع‌شده سریع حذف شوند
    timeout: "2s"
  },

  // فقط outboundهای واقعی سرورها تست شوند
  subjectSelector: nodeTags
}
  };

  if (type === "finalMask") {
    cfg._coreCheck = {
      featureRequired: "finalMask",
      compatibleApp: "PattNG / Custom Xray Core",
      warningNotice: "If your Xray core fails to load this config, please update your client to PattNG or a core supporting finalMask."
    };
  }

  return cfg;
}
