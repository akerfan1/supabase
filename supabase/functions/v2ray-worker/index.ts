// Cloudflare Worker — Xray dynamic best-ping (every 30s) + Fragment
// Output: JSON array with two full configs so v2rayN imports two separate profiles
// Routes:
//   /?uuid=1            -> [ LoadBalance(auto bestPing/30s), Fragment(auto bestPing/30s) ]
//   /?uuid=1&view=sub   -> v2rayN/NG subscription (links base64; raw nodes)
// Note: "best" انتخاب در خود Xray انجام می‌شود (observatory + leastPing)، نه در Worker.

// Deno / Supabase Edge Function
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

  // Build two full configs with dynamic leastPing every 30s
  const configLB = buildFullConfig(nodes, /*withFragment*/ false);
  const configFragment = buildFullConfig(nodes, /*withFragment*/ true);

    return new Response(JSON.stringify([configLB, configFragment], null, 2), {
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
          "vless://5f99fbcc-bac8-44f0-9f33-fcb9fecfd326@198.41.204.141:443?encryption=none&security=tls&sni=test5000.erfanfamily2.ir&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=test5000.erfanfamily2.ir&path=%2FeyJqdW5rIjoiRlV2bnBzS09yNVZLIiwicHJvdG9jb2wiOiJ2bCIsIm1vZGUiOiJwcm94eWlwIiwicGFuZWxJUHMiOltdfQ%3D%3D%3Fed%3D2560#2",
          "vless://02b1ea62-173d-43df-a566-6f0f65536e23@172.64.75.10:443?encryption=none&security=tls&sni=hawm.erfanfamily2.ir&fp=random&alpn=h3%2Ch2%2Chttp%2F1.1&insecure=0&allowInsecure=0&type=ws&host=hawm.erfanfamily2.ir&path=%2F%3Fed%3D2048#3",
          "vless://a57c04f8-3c73-7f22-58dc-d4f7e26b70cf@104.27.0.194:443?encryption=none&security=tls&sni=dsad4073.v6qnd9c1.workers.dev&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=dsad4073.v6qnd9c1.workers.dev&path=%2Fx4g-update-production.up.railway.app%2Fws%2Fa57c04f8-3c73-7f22-58dc-d4f7e26b70cf#4", 
          "vless://1db32709-d9b9-465b-877e-7a779a6fe215@104.27.119.28:443?encryption=none&security=tls&sni=dsad4073.v6qnd9c1.workers.dev&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=dsad4073.v6qnd9c1.workers.dev&path=%2F3x-ui-upgrade.up.railway.app%2F#5",
    // "vmess://<base64-json>"
  ],
  "2": [
          "vless://0b6f55ce-2c36-453c-899c-89afcb2d7b6e@104.16.72.162:443?encryption=none&security=tls&sni=nalam.erfnmndi474.workers.dev&fp=random&insecure=0&allowInsecure=0&type=ws&host=nalam.erfnmndi474.workers.dev&path=%2Fgateway#8",
          "vless://b56b8e9c-b338-4d42-87c0-35ce808f41eb@104.21.74.63:8443?encryption=none&security=tls&sni=gorbahh.erfanhub.ir&fp=random&insecure=0&allowInsecure=0&type=ws&host=gorbahh.erfanhub.ir&path=%2Fproxyip%3D23.94.103.194#9",
          "vless://62200345-c1ab-490b-8765-a04f8fb66019@104.18.40.185:443?encryption=none&security=tls&sni=wvFi202vdOJ9OUUHKNpDIvCn7723ib60.ErFanMandI3030.WORkERs.deV&fp=chrome&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=wvfi202vdoj9ouuhknpdivcn7723ib60.erfanmandi3030.workers.dev&path=%2FeyJqdW5rIjoiZXJsQ0dvVGFtaG9zTUxtIiwicHJvdG9jb2wiOiJ2bCIsIm1vZGUiOiJwcm94eWlwIiwicGFuZWxJUHMiOltdfQ%3D%3D%3Fed%3D2560#10",
          "vless://2fdbf44a-0d36-426b-80de-b5104940f4e4@104.27.0.194:443?encryption=none&security=tls&sni=neon-path-pixel-1e06a1.erfnmndi474.workers.dev&fp=chrome&insecure=0&allowInsecure=0&type=ws&host=neon-path-pixel-1e06a1.erfnmndi474.workers.dev&path=%2F#11",
          "vless://65bed288-9602-d3aa-f7ef-752da3683677@104.25.37.151:443?encryption=none&security=tls&sni=all.erfnmndi474.workers.dev&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=all.erfnmndi474.workers.dev&path=%2Fx4g-production-1e7a.up.railway.app%2Fws%2F65bed288-9602-d3aa-f7ef-752da3683677#12",
  ],
  "3": [
      "vless://14e28b36-9a4d-40a4-9aff-fb63163c74f4@104.16.73.110:443?encryption=none&security=tls&sni=test1200.erfanhub.ir&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=test1200.erfanhub.ir&path=%2Fpyip%3D178.156.139.174#8",
        "vless://14e28b36-9a4d-40a4-9aff-fb63163c74f4@172.64.229.36:443?encryption=none&security=tls&sni=test1200.erfanhub.ir&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=test1200.erfanhub.ir&path=%2Fpyip%3D178.156.139.174#9",
        "vless://14e28b36-9a4d-40a4-9aff-fb63163c74f4@104.17.108.68:443?encryption=none&security=tls&sni=test1200.erfanhub.ir&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=test1200.erfanhub.ir&path=%2Fpyip%3D178.156.139.174#10",
        "vless://14e28b36-9a4d-40a4-9aff-fb63163c74f4@45.67.215.67:443?encryption=none&security=tls&sni=test1200.erfanhub.ir&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=test1200.erfanhub.ir&path=%2Fpyip%3D178.156.139.174#11",
        "vless://14e28b36-9a4d-40a4-9aff-fb63163c74f4@45.85.119.95:443?encryption=none&security=tls&sni=test1200.erfanhub.ir&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=test1200.erfanhub.ir&path=%2Fpyip%3D178.156.139.174#12",
        "vless://14e28b36-9a4d-40a4-9aff-fb63163c74f4@198.41.204.141:443?encryption=none&security=tls&sni=test1200.erfanhub.ir&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=test1200.erfanhub.ir&path=%2Fpyip%3D178.156.139.174#13",
        "vless://14e28b36-9a4d-40a4-9aff-fb63163c74f4@172.64.75.10:443?encryption=none&security=tls&sni=test1200.erfanhub.ir&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=test1200.erfanhub.ir&path=%2Fpyip%3D178.156.139.174#14",
        "vless://5f99fbcc-bac8-44f0-9f33-fcb9fecfd326@104.16.73.110:443?encryption=none&security=tls&sni=test5000.erfanfamily2.ir&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=test5000.erfanfamily2.ir&path=%2FeyJqdW5rIjoiRlV2bnBzS09yNVZLIiwicHJvdG9jb2wiOiJ2bCIsIm1vZGUiOiJwcm94eWlwIiwicGFuZWxJUHMiOltdfQ%3D%3D%3Fed%3D2560#15",
        "vless://5f99fbcc-bac8-44f0-9f33-fcb9fecfd326@172.64.229.36:443?encryption=none&security=tls&sni=test5000.erfanfamily2.ir&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=test5000.erfanfamily2.ir&path=%2FeyJqdW5rIjoiRlV2bnBzS09yNVZLIiwicHJvdG9jb2wiOiJ2bCIsIm1vZGUiOiJwcm94eWlwIiwicGFuZWxJUHMiOltdfQ%3D%3D%3Fed%3D2560#16",
        "vless://5f99fbcc-bac8-44f0-9f33-fcb9fecfd326@104.17.108.68:443?encryption=none&security=tls&sni=test5000.erfanfamily2.ir&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=test5000.erfanfamily2.ir&path=%2FeyJqdW5rIjoiRlV2bnBzS09yNVZLIiwicHJvdG9jb2wiOiJ2bCIsIm1vZGUiOiJwcm94eWlwIiwicGFuZWxJUHMiOltdfQ%3D%3D%3Fed%3D2560#17",
        "vless://5f99fbcc-bac8-44f0-9f33-fcb9fecfd326@45.67.215.67:443?encryption=none&security=tls&sni=test5000.erfanfamily2.ir&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=test5000.erfanfamily2.ir&path=%2FeyJqdW5rIjoiRlV2bnBzS09yNVZLIiwicHJvdG9jb2wiOiJ2bCIsIm1vZGUiOiJwcm94eWlwIiwicGFuZWxJUHMiOltdfQ%3D%3D%3Fed%3D2560#18",
        "vless://5f99fbcc-bac8-44f0-9f33-fcb9fecfd326@45.85.119.95:443?encryption=none&security=tls&sni=test5000.erfanfamily2.ir&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=test5000.erfanfamily2.ir&path=%2FeyJqdW5rIjoiRlV2bnBzS09yNVZLIiwicHJvdG9jb2wiOiJ2bCIsIm1vZGUiOiJwcm94eWlwIiwicGFuZWxJUHMiOltdfQ%3D%3D%3Fed%3D2560#19",
        "vless://5f99fbcc-bac8-44f0-9f33-fcb9fecfd326@198.41.204.141:443?encryption=none&security=tls&sni=test5000.erfanfamily2.ir&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=test5000.erfanfamily2.ir&path=%2FeyJqdW5rIjoiRlV2bnBzS09yNVZLIiwicHJvdG9jb2wiOiJ2bCIsIm1vZGUiOiJwcm94eWlwIiwicGFuZWxJUHMiOltdfQ%3D%3D%3Fed%3D2560#20",
        "vless://5f99fbcc-bac8-44f0-9f33-fcb9fecfd326@172.64.75.10:443?encryption=none&security=tls&sni=test5000.erfanfamily2.ir&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=test5000.erfanfamily2.ir&path=%2FeyJqdW5rIjoiRlV2bnBzS09yNVZLIiwicHJvdG9jb2wiOiJ2bCIsIm1vZGUiOiJwcm94eWlwIiwicGFuZWxJUHMiOltdfQ%3D%3D%3Fed%3D2560#21",
        "vless://02b1ea62-173d-43df-a566-6f0f65536e23@104.16.73.110:443?encryption=none&security=tls&sni=hawm.erfanfamily2.ir&fp=random&alpn=h3%2Ch2%2Chttp%2F1.1&insecure=0&allowInsecure=0&type=ws&host=hawm.erfanfamily2.ir&path=%2F%3Fed%3D2048#22",
        "vless://02b1ea62-173d-43df-a566-6f0f65536e23@172.64.229.36:443?encryption=none&security=tls&sni=hawm.erfanfamily2.ir&fp=random&alpn=h3%2Ch2%2Chttp%2F1.1&insecure=0&allowInsecure=0&type=ws&host=hawm.erfanfamily2.ir&path=%2F%3Fed%3D2048#23",
        "vless://02b1ea62-173d-43df-a566-6f0f65536e23@104.17.108.68:443?encryption=none&security=tls&sni=hawm.erfanfamily2.ir&fp=random&alpn=h3%2Ch2%2Chttp%2F1.1&insecure=0&allowInsecure=0&type=ws&host=hawm.erfanfamily2.ir&path=%2F%3Fed%3D2048#24",
        "vless://02b1ea62-173d-43df-a566-6f0f65536e23@45.67.215.67:443?encryption=none&security=tls&sni=hawm.erfanfamily2.ir&fp=random&alpn=h3%2Ch2%2Chttp%2F1.1&insecure=0&allowInsecure=0&type=ws&host=hawm.erfanfamily2.ir&path=%2F%3Fed%3D2048#25",
        "vless://02b1ea62-173d-43df-a566-6f0f65536e23@45.85.119.95:443?encryption=none&security=tls&sni=hawm.erfanfamily2.ir&fp=random&alpn=h3%2Ch2%2Chttp%2F1.1&insecure=0&allowInsecure=0&type=ws&host=hawm.erfanfamily2.ir&path=%2F%3Fed%3D2048#26",
        "vless://02b1ea62-173d-43df-a566-6f0f65536e23@198.41.204.141:443?encryption=none&security=tls&sni=hawm.erfanfamily2.ir&fp=random&alpn=h3%2Ch2%2Chttp%2F1.1&insecure=0&allowInsecure=0&type=ws&host=hawm.erfanfamily2.ir&path=%2F%3Fed%3D2048#27",
        "vless://02b1ea62-173d-43df-a566-6f0f65536e23@172.64.75.10:443?encryption=none&security=tls&sni=hawm.erfanfamily2.ir&fp=random&alpn=h3%2Ch2%2Chttp%2F1.1&insecure=0&allowInsecure=0&type=ws&host=hawm.erfanfamily2.ir&path=%2F%3Fed%3D2048#28",
        "vless://a57c04f8-3c73-7f22-58dc-d4f7e26b70cf@104.16.73.110:443?encryption=none&security=tls&sni=dsad4073.v6qnd9c1.workers.dev&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=dsad4073.v6qnd9c1.workers.dev&path=%2Fx4g-update-production.up.railway.app%2Fws%2Fa57c04f8-3c73-7f22-58dc-d4f7e26b70cf#29",
        "vless://a57c04f8-3c73-7f22-58dc-d4f7e26b70cf@172.64.229.36:443?encryption=none&security=tls&sni=dsad4073.v6qnd9c1.workers.dev&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=dsad4073.v6qnd9c1.workers.dev&path=%2Fx4g-update-production.up.railway.app%2Fws%2Fa57c04f8-3c73-7f22-58dc-d4f7e26b70cf#30",
        "vless://a57c04f8-3c73-7f22-58dc-d4f7e26b70cf@104.17.108.68:443?encryption=none&security=tls&sni=dsad4073.v6qnd9c1.workers.dev&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=dsad4073.v6qnd9c1.workers.dev&path=%2Fx4g-update-production.up.railway.app%2Fws%2Fa57c04f8-3c73-7f22-58dc-d4f7e26b70cf#31",
        "vless://a57c04f8-3c73-7f22-58dc-d4f7e26b70cf@45.67.215.67:443?encryption=none&security=tls&sni=dsad4073.v6qnd9c1.workers.dev&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=dsad4073.v6qnd9c1.workers.dev&path=%2Fx4g-update-production.up.railway.app%2Fws%2Fa57c04f8-3c73-7f22-58dc-d4f7e26b70cf#32",
        "vless://a57c04f8-3c73-7f22-58dc-d4f7e26b70cf@45.85.119.95:443?encryption=none&security=tls&sni=dsad4073.v6qnd9c1.workers.dev&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=dsad4073.v6qnd9c1.workers.dev&path=%2Fx4g-update-production.up.railway.app%2Fws%2Fa57c04f8-3c73-7f22-58dc-d4f7e26b70cf#33",
        "vless://a57c04f8-3c73-7f22-58dc-d4f7e26b70cf@198.41.204.141:443?encryption=none&security=tls&sni=dsad4073.v6qnd9c1.workers.dev&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=dsad4073.v6qnd9c1.workers.dev&path=%2Fx4g-update-production.up.railway.app%2Fws%2Fa57c04f8-3c73-7f22-58dc-d4f7e26b70cf#34",
        "vless://a57c04f8-3c73-7f22-58dc-d4f7e26b70cf@172.64.75.10:443?encryption=none&security=tls&sni=dsad4073.v6qnd9c1.workers.dev&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=dsad4073.v6qnd9c1.workers.dev&path=%2Fx4g-update-production.up.railway.app%2Fws%2Fa57c04f8-3c73-7f22-58dc-d4f7e26b70cf#35",
        "vless://1db32709-d9b9-465b-877e-7a779a6fe215@104.16.73.110:443?encryption=none&security=tls&sni=dsad4073.v6qnd9c1.workers.dev&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=dsad4073.v6qnd9c1.workers.dev&path=%2F3x-ui-upgrade.up.railway.app%2F#36",
        "vless://1db32709-d9b9-465b-877e-7a779a6fe215@172.64.229.36:443?encryption=none&security=tls&sni=dsad4073.v6qnd9c1.workers.dev&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=dsad4073.v6qnd9c1.workers.dev&path=%2F3x-ui-upgrade.up.railway.app%2F#37",
        "vless://1db32709-d9b9-465b-877e-7a779a6fe215@104.17.108.68:443?encryption=none&security=tls&sni=dsad4073.v6qnd9c1.workers.dev&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=dsad4073.v6qnd9c1.workers.dev&path=%2F3x-ui-upgrade.up.railway.app%2F#38",
        "vless://1db32709-d9b9-465b-877e-7a779a6fe215@45.67.215.67:443?encryption=none&security=tls&sni=dsad4073.v6qnd9c1.workers.dev&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=dsad4073.v6qnd9c1.workers.dev&path=%2F3x-ui-upgrade.up.railway.app%2F#39",
        "vless://1db32709-d9b9-465b-877e-7a779a6fe215@45.85.119.95:443?encryption=none&security=tls&sni=dsad4073.v6qnd9c1.workers.dev&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=dsad4073.v6qnd9c1.workers.dev&path=%2F3x-ui-upgrade.up.railway.app%2F#40",
        "vless://1db32709-d9b9-465b-877e-7a779a6fe215@198.41.204.141:443?encryption=none&security=tls&sni=dsad4073.v6qnd9c1.workers.dev&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=dsad4073.v6qnd9c1.workers.dev&path=%2F3x-ui-upgrade.up.railway.app%2F#41",
        "vless://1db32709-d9b9-465b-877e-7a779a6fe215@172.64.75.10:443?encryption=none&security=tls&sni=dsad4073.v6qnd9c1.workers.dev&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=dsad4073.v6qnd9c1.workers.dev&path=%2F3x-ui-upgrade.up.railway.app%2F#42",
  ],
  "4": [
      "vless://0b6f55ce-2c36-453c-899c-89afcb2d7b6e@104.16.73.110:443?encryption=none&security=tls&sni=nalam.erfnmndi474.workers.dev&fp=random&insecure=0&allowInsecure=0&type=ws&host=nalam.erfnmndi474.workers.dev&path=%2Fgateway#8",
        "vless://0b6f55ce-2c36-453c-899c-89afcb2d7b6e@172.64.229.36:443?encryption=none&security=tls&sni=nalam.erfnmndi474.workers.dev&fp=random&insecure=0&allowInsecure=0&type=ws&host=nalam.erfnmndi474.workers.dev&path=%2Fgateway#9",
        "vless://0b6f55ce-2c36-453c-899c-89afcb2d7b6e@104.17.108.68:443?encryption=none&security=tls&sni=nalam.erfnmndi474.workers.dev&fp=random&insecure=0&allowInsecure=0&type=ws&host=nalam.erfnmndi474.workers.dev&path=%2Fgateway#10",
        "vless://0b6f55ce-2c36-453c-899c-89afcb2d7b6e@45.67.215.67:443?encryption=none&security=tls&sni=nalam.erfnmndi474.workers.dev&fp=random&insecure=0&allowInsecure=0&type=ws&host=nalam.erfnmndi474.workers.dev&path=%2Fgateway#11",
        "vless://0b6f55ce-2c36-453c-899c-89afcb2d7b6e@45.85.119.95:443?encryption=none&security=tls&sni=nalam.erfnmndi474.workers.dev&fp=random&insecure=0&allowInsecure=0&type=ws&host=nalam.erfnmndi474.workers.dev&path=%2Fgateway#12",
        "vless://0b6f55ce-2c36-453c-899c-89afcb2d7b6e@198.41.204.141:443?encryption=none&security=tls&sni=nalam.erfnmndi474.workers.dev&fp=random&insecure=0&allowInsecure=0&type=ws&host=nalam.erfnmndi474.workers.dev&path=%2Fgateway#13",
        "vless://0b6f55ce-2c36-453c-899c-89afcb2d7b6e@172.64.75.10:443?encryption=none&security=tls&sni=nalam.erfnmndi474.workers.dev&fp=random&insecure=0&allowInsecure=0&type=ws&host=nalam.erfnmndi474.workers.dev&path=%2Fgateway#14",
        "vless://b56b8e9c-b338-4d42-87c0-35ce808f41eb@104.16.73.110:8443?encryption=none&security=tls&sni=gorbahh.erfanhub.ir&fp=random&insecure=0&allowInsecure=0&type=ws&host=gorbahh.erfanhub.ir&path=%2Fproxyip%3D23.94.103.194#15",
        "vless://b56b8e9c-b338-4d42-87c0-35ce808f41eb@172.64.229.36:8443?encryption=none&security=tls&sni=gorbahh.erfanhub.ir&fp=random&insecure=0&allowInsecure=0&type=ws&host=gorbahh.erfanhub.ir&path=%2Fproxyip%3D23.94.103.194#16",
        "vless://b56b8e9c-b338-4d42-87c0-35ce808f41eb@104.17.108.68:8443?encryption=none&security=tls&sni=gorbahh.erfanhub.ir&fp=random&insecure=0&allowInsecure=0&type=ws&host=gorbahh.erfanhub.ir&path=%2Fproxyip%3D23.94.103.194#17",
        "vless://b56b8e9c-b338-4d42-87c0-35ce808f41eb@45.67.215.67:8443?encryption=none&security=tls&sni=gorbahh.erfanhub.ir&fp=random&insecure=0&allowInsecure=0&type=ws&host=gorbahh.erfanhub.ir&path=%2Fproxyip%3D23.94.103.194#18",
        "vless://b56b8e9c-b338-4d42-87c0-35ce808f41eb@45.85.119.95:8443?encryption=none&security=tls&sni=gorbahh.erfanhub.ir&fp=random&insecure=0&allowInsecure=0&type=ws&host=gorbahh.erfanhub.ir&path=%2Fproxyip%3D23.94.103.194#19",
        "vless://b56b8e9c-b338-4d42-87c0-35ce808f41eb@198.41.204.141:8443?encryption=none&security=tls&sni=gorbahh.erfanhub.ir&fp=random&insecure=0&allowInsecure=0&type=ws&host=gorbahh.erfanhub.ir&path=%2Fproxyip%3D23.94.103.194#20",
        "vless://b56b8e9c-b338-4d42-87c0-35ce808f41eb@172.64.75.10:8443?encryption=none&security=tls&sni=gorbahh.erfanhub.ir&fp=random&insecure=0&allowInsecure=0&type=ws&host=gorbahh.erfanhub.ir&path=%2Fproxyip%3D23.94.103.194#21",
        "vless://62200345-c1ab-490b-8765-a04f8fb66019@104.16.73.110:443?encryption=none&security=tls&sni=wvFi202vdOJ9OUUHKNpDIvCn7723ib60.ErFanMandI3030.WORkERs.deV&fp=chrome&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=wvfi202vdoj9ouuhknpdivcn7723ib60.erfanmandi3030.workers.dev&path=%2FeyJqdW5rIjoiZXJsQ0dvVGFtaG9zTUxtIiwicHJvdG9jb2wiOiJ2bCIsIm1vZGUiOiJwcm94eWlwIiwicGFuZWxJUHMiOltdfQ%3D%3D%3Fed%3D2560#22",
        "vless://62200345-c1ab-490b-8765-a04f8fb66019@172.64.229.36:443?encryption=none&security=tls&sni=wvFi202vdOJ9OUUHKNpDIvCn7723ib60.ErFanMandI3030.WORkERs.deV&fp=chrome&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=wvfi202vdoj9ouuhknpdivcn7723ib60.erfanmandi3030.workers.dev&path=%2FeyJqdW5rIjoiZXJsQ0dvVGFtaG9zTUxtIiwicHJvdG9jb2wiOiJ2bCIsIm1vZGUiOiJwcm94eWlwIiwicGFuZWxJUHMiOltdfQ%3D%3D%3Fed%3D2560#23",
        "vless://62200345-c1ab-490b-8765-a04f8fb66019@104.17.108.68:443?encryption=none&security=tls&sni=wvFi202vdOJ9OUUHKNpDIvCn7723ib60.ErFanMandI3030.WORkERs.deV&fp=chrome&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=wvfi202vdoj9ouuhknpdivcn7723ib60.erfanmandi3030.workers.dev&path=%2FeyJqdW5rIjoiZXJsQ0dvVGFtaG9zTUxtIiwicHJvdG9jb2wiOiJ2bCIsIm1vZGUiOiJwcm94eWlwIiwicGFuZWxJUHMiOltdfQ%3D%3D%3Fed%3D2560#24",
        "vless://62200345-c1ab-490b-8765-a04f8fb66019@45.67.215.67:443?encryption=none&security=tls&sni=wvFi202vdOJ9OUUHKNpDIvCn7723ib60.ErFanMandI3030.WORkERs.deV&fp=chrome&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=wvfi202vdoj9ouuhknpdivcn7723ib60.erfanmandi3030.workers.dev&path=%2FeyJqdW5rIjoiZXJsQ0dvVGFtaG9zTUxtIiwicHJvdG9jb2wiOiJ2bCIsIm1vZGUiOiJwcm94eWlwIiwicGFuZWxJUHMiOltdfQ%3D%3D%3Fed%3D2560#25",
        "vless://62200345-c1ab-490b-8765-a04f8fb66019@45.85.119.95:443?encryption=none&security=tls&sni=wvFi202vdOJ9OUUHKNpDIvCn7723ib60.ErFanMandI3030.WORkERs.deV&fp=chrome&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=wvfi202vdoj9ouuhknpdivcn7723ib60.erfanmandi3030.workers.dev&path=%2FeyJqdW5rIjoiZXJsQ0dvVGFtaG9zTUxtIiwicHJvdG9jb2wiOiJ2bCIsIm1vZGUiOiJwcm94eWlwIiwicGFuZWxJUHMiOltdfQ%3D%3D%3Fed%3D2560#26",
        "vless://62200345-c1ab-490b-8765-a04f8fb66019@198.41.204.141:443?encryption=none&security=tls&sni=wvFi202vdOJ9OUUHKNpDIvCn7723ib60.ErFanMandI3030.WORkERs.deV&fp=chrome&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=wvfi202vdoj9ouuhknpdivcn7723ib60.erfanmandi3030.workers.dev&path=%2FeyJqdW5rIjoiZXJsQ0dvVGFtaG9zTUxtIiwicHJvdG9jb2wiOiJ2bCIsIm1vZGUiOiJwcm94eWlwIiwicGFuZWxJUHMiOltdfQ%3D%3D%3Fed%3D2560#27",
        "vless://62200345-c1ab-490b-8765-a04f8fb66019@172.64.75.10:443?encryption=none&security=tls&sni=wvFi202vdOJ9OUUHKNpDIvCn7723ib60.ErFanMandI3030.WORkERs.deV&fp=chrome&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=wvfi202vdoj9ouuhknpdivcn7723ib60.erfanmandi3030.workers.dev&path=%2FeyJqdW5rIjoiZXJsQ0dvVGFtaG9zTUxtIiwicHJvdG9jb2wiOiJ2bCIsIm1vZGUiOiJwcm94eWlwIiwicGFuZWxJUHMiOltdfQ%3D%3D%3Fed%3D2560#28",
        "vless://2fdbf44a-0d36-426b-80de-b5104940f4e4@104.16.73.110:443?encryption=none&security=tls&sni=neon-path-pixel-1e06a1.erfnmndi474.workers.dev&fp=chrome&insecure=0&allowInsecure=0&type=ws&host=neon-path-pixel-1e06a1.erfnmndi474.workers.dev&path=%2F#29",
        "vless://2fdbf44a-0d36-426b-80de-b5104940f4e4@172.64.229.36:443?encryption=none&security=tls&sni=neon-path-pixel-1e06a1.erfnmndi474.workers.dev&fp=chrome&insecure=0&allowInsecure=0&type=ws&host=neon-path-pixel-1e06a1.erfnmndi474.workers.dev&path=%2F#30",
        "vless://2fdbf44a-0d36-426b-80de-b5104940f4e4@104.17.108.68:443?encryption=none&security=tls&sni=neon-path-pixel-1e06a1.erfnmndi474.workers.dev&fp=chrome&insecure=0&allowInsecure=0&type=ws&host=neon-path-pixel-1e06a1.erfnmndi474.workers.dev&path=%2F#31",
        "vless://2fdbf44a-0d36-426b-80de-b5104940f4e4@45.67.215.67:443?encryption=none&security=tls&sni=neon-path-pixel-1e06a1.erfnmndi474.workers.dev&fp=chrome&insecure=0&allowInsecure=0&type=ws&host=neon-path-pixel-1e06a1.erfnmndi474.workers.dev&path=%2F#32",
        "vless://2fdbf44a-0d36-426b-80de-b5104940f4e4@45.85.119.95:443?encryption=none&security=tls&sni=neon-path-pixel-1e06a1.erfnmndi474.workers.dev&fp=chrome&insecure=0&allowInsecure=0&type=ws&host=neon-path-pixel-1e06a1.erfnmndi474.workers.dev&path=%2F#33",
        "vless://2fdbf44a-0d36-426b-80de-b5104940f4e4@198.41.204.141:443?encryption=none&security=tls&sni=neon-path-pixel-1e06a1.erfnmndi474.workers.dev&fp=chrome&insecure=0&allowInsecure=0&type=ws&host=neon-path-pixel-1e06a1.erfnmndi474.workers.dev&path=%2F#34",
        "vless://2fdbf44a-0d36-426b-80de-b5104940f4e4@172.64.75.10:443?encryption=none&security=tls&sni=neon-path-pixel-1e06a1.erfnmndi474.workers.dev&fp=chrome&insecure=0&allowInsecure=0&type=ws&host=neon-path-pixel-1e06a1.erfnmndi474.workers.dev&path=%2F#35",
        "vless://65bed288-9602-d3aa-f7ef-752da3683677@104.16.73.110:443?encryption=none&security=tls&sni=all.erfnmndi474.workers.dev&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=all.erfnmndi474.workers.dev&path=%2Fx4g-production-1e7a.up.railway.app%2Fws%2F65bed288-9602-d3aa-f7ef-752da3683677#36",
        "vless://65bed288-9602-d3aa-f7ef-752da3683677@172.64.229.36:443?encryption=none&security=tls&sni=all.erfnmndi474.workers.dev&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=all.erfnmndi474.workers.dev&path=%2Fx4g-production-1e7a.up.railway.app%2Fws%2F65bed288-9602-d3aa-f7ef-752da3683677#37",
        "vless://65bed288-9602-d3aa-f7ef-752da3683677@104.17.108.68:443?encryption=none&security=tls&sni=all.erfnmndi474.workers.dev&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=all.erfnmndi474.workers.dev&path=%2Fx4g-production-1e7a.up.railway.app%2Fws%2F65bed288-9602-d3aa-f7ef-752da3683677#38",
        "vless://65bed288-9602-d3aa-f7ef-752da3683677@45.67.215.67:443?encryption=none&security=tls&sni=all.erfnmndi474.workers.dev&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=all.erfnmndi474.workers.dev&path=%2Fx4g-production-1e7a.up.railway.app%2Fws%2F65bed288-9602-d3aa-f7ef-752da3683677#39",
        "vless://65bed288-9602-d3aa-f7ef-752da3683677@45.85.119.95:443?encryption=none&security=tls&sni=all.erfnmndi474.workers.dev&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=all.erfnmndi474.workers.dev&path=%2Fx4g-production-1e7a.up.railway.app%2Fws%2F65bed288-9602-d3aa-f7ef-752da3683677#40",
        "vless://65bed288-9602-d3aa-f7ef-752da3683677@198.41.204.141:443?encryption=none&security=tls&sni=all.erfnmndi474.workers.dev&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=all.erfnmndi474.workers.dev&path=%2Fx4g-production-1e7a.up.railway.app%2Fws%2F65bed288-9602-d3aa-f7ef-752da3683677#41",
        "vless://65bed288-9602-d3aa-f7ef-752da3683677@172.64.75.10:443?encryption=none&security=tls&sni=all.erfnmndi474.workers.dev&fp=random&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=all.erfnmndi474.workers.dev&path=%2Fx4g-production-1e7a.up.railway.app%2Fws%2F65bed288-9602-d3aa-f7ef-752da3683677#42",
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
  // VLESS / Trojan (URL) or VMess (vmess://<b64 json>)
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
function buildOutbound(node, idx, withFragment) {
  const t = safeTag(node.tag);
  const tag = `node-${idx}-${t}`;
  const base = {
    tag,
    protocol: node.protocol,
    streamSettings: buildStream(node, withFragment)
  };

  if (node.protocol === "vless") {
    base.settings = {
      vnext: [
        {
          address: node.address,
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

function buildStream(node, withFragment) {
  const s = {
    network: node.network,
    security: node.security === "tls" ? "tls" : "",
    sockopt: { domainStrategy: "UseIPv4v6" }
  };

  if (node.security === "tls") {
    s.tlsSettings = {
      allowInsecure: false,
      fingerprint: node.fp || "randomized",
      alpn: node.alpn || ["http/1.1"],
      serverName: node.sni || node.address
    };

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
  if (withFragment) {
    // همه outboundهای نودی از طریق این پروکسیِ fragment دایل می‌شن
    s.sockopt.dialerProxy = "Irancell";
  }
  return s;
}

function buildFullConfig(nodes, withFragment) {
  // بسازیم outboundها و لیست تگ‌ها برای بالانسر/observatory
  const outbounds = nodes.map((n, i) => buildOutbound(n, i + 1, withFragment));
  const nodeTags = outbounds.map(o => o.tag);

  // fragment outbound (فقط در کانفیگ fragment)
  if (withFragment) {
    outbounds.push({
      tag: "fragment",
      protocol: "freedom",
      settings: {
        // Fragment settings (TLS Hello fragmentation)
        fragment: { packets: "tlshello", length: "1", interval: "0" },
        domainStrategy: "UseIPv4v6"
      }
    });
  }

  // outbounds عمومی
  outbounds.push({ protocol: "dns", tag: "dns-out" });
  outbounds.push({ protocol: "freedom", tag: "direct", settings: { domainStrategy: "UseIP" } });
  outbounds.push({ protocol: "blackhole", tag: "block", settings: { response: { type: "http" } } });

  // کانفیگ نهایی — با بالانسر leastLoad + burstObservatory هر 15 دقیقه
  const cfg = {
    remarks: withFragment ? "Fragment " : "⚡best load {بهترین سرعت}⚡",
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

    // مهم: بالانسر leastLoad با انتخاب بین تمام nodeTags
    routing: {
      domainStrategy: "IPIfNonMatch",
      domainMatcher: "hybrid",
      rules: [
        // تمام ترافیک از inbound ساکس به بالانسر میره
        { type: "field", inboundTag: ["socks-in", "http"], balancerTag: "auto" }
      ],
      balancers: [
        {
          tag: "auto",
          selector: nodeTags,           // انتخاب بین تمام نودها
          strategy: { type: "leastLoad" }
        }
      ]
    },

    stats: {},

    api: {
      tag: "api",
      services: ["StatsService"]
    },

    // مهم: سنجش دوره‌ای پینگ هر 15 دقیقه روی همه نودها با burstObservatory
    burstObservatory: {
      pingConfig: {
        connectivity: "http://connectivitycheck.platform.hicloud.com/generate_204",
        destination: "http://www.google.com/gen_204",
        interval: "10m",
        sampling: 5,
        timeout: "3s"
      },
      subjectSelector: nodeTags         // همین نودها سنجیده می‌شن
    }
  };

  return cfg;
}
