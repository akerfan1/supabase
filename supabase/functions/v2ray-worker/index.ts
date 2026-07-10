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

  return new Response(JSON.stringify([configLB], null, 2), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
});

/* ================
   Server groups
   ================ */
const serverGroups = {
  "1": [
    // نمونه‌ها — لینک‌های خودت را بگذار
          "vless://14e28b36-9a4d-40a4-9aff-fb63163c74f4@164.90.176.31:443?encryption=none&security=tls&sni=test1200.erfanhub.ir&fp=chrome&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=test1200.erfanhub.ir&path=%2Fpyip%3Dprx.erfanfamily2.ir#1",
          "vless://5f99fbcc-bac8-44f0-9f33-fcb9fecfd326@216.24.57.6:443?encryption=none&security=tls&sni=test5000.erfanfamily2.ir&fp=chrome&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=test5000.erfanfamily2.ir&path=%2FeyJqdW5rIjoiRlV2bnBzS09yNVZLIiwicHJvdG9jb2wiOiJ2bCIsIm1vZGUiOiJwcm94eWlwIiwicGFuZWxJUHMiOltdfQ%3D%3D%3Fed%3D2560#2",
          "vless://02b1ea62-173d-43df-a566-6f0f65536e23@172.64.231.232:443?path=%2F%3Fed%3D2048&security=tls&alpn=h3%2Ch2%2Chttp%2F1.1&encryption=none&insecure=0&host=hawm.erfanfamily2.ir&fp=chrome&type=ws&allowInsecure=0&sni=hawm.erfanfamily2.ir#3",
          "vless://e4f3bd9d-cace-4816-8b7d-2cd58fdeea44@172.67.65.146:2096?encryption=none&security=tls&sni=test66698.erfnmndi343-e4b.workers.dev&fp=chrome&insecure=0&allowInsecure=0&type=ws&host=test66698.erfnmndi343-e4b.workers.dev&path=%2F#4", 
          "vless://fa7cb5a1-b713-40eb-b6cd-45b6b5095841@wsabi.erfanhub.ir:443?encryption=none&security=tls&sni=lololowe.wasmer.app&fp=chrome&insecure=0&allowInsecure=0&type=ws&host=lololowe.wasmer.app&path=%2Ffa7cb5a1#5",
          "vless://fa7cb5a1-b713-40eb-b6cd-45b6b5095841@44.32.235.22:443?encryption=none&security=tls&sni=spring.erfnmndi343-e4b.workers.dev&fp=chrome&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=spring.erfnmndi343-e4b.workers.dev&path=%2FutvIMOF9bFmD%3Fed%3D2048#6",
          "vless://fa7cb5a1-b713-40eb-b6cd-45b6b5095841@wsabi.erfanhub.ir:443?encryption=none&security=tls&sni=popoweqf.wasmer.app&fp=chrome&insecure=0&allowInsecure=0&type=ws&host=popoweqf.wasmer.app&path=%2Ffa7cb5a1#7"
    // "vmess://<base64-json>"
  ],
  "2": [
          "vless://25b377e5-ae6d-43a4-b0ed-afea87612ef9@172.64.231.232:443?encryption=none&security=tls&sni=shrim.erfanfamily.ir&fp=chrome&insecure=0&allowInsecure=0&type=ws&host=shrim.erfanfamily.ir&path=%2FeyJqdW5rIjoiNnJtaUl1N2UxeTNZIiwicHJvdG9jb2wiOiJ2bCIsIm1vZGUiOiJwcm94eWlwIiwicGFuZWxJUHMiOltdfQ%3D%3D%3Fed%3D2560#8",
          "vless://02b1ea62-173d-43df-a566-6f0f65536e23@wsabi.erfanhub.ir:443?encryption=none&security=tls&sni=urmydreams.wasmer.app&fp=chrome&insecure=0&allowInsecure=0&type=ws&host=urmydreams.wasmer.app&path=%2F02b1ea62#9",
          "vless://4f330c55-87b3-4092-af79-be498c37846c@164.90.176.31:443?encryption=none&security=tls&sni=wr031vlkvbilaorzh8wdvbntp4bmpjlq.a6rwa13k.workers.dev&fp=chrome&insecure=0&allowInsecure=0&type=ws&host=wr031vlkvbilaorzh8wdvbntp4bmpjlq.a6rwa13k.workers.dev&path=%2FeyJqdW5rIjoiRDBFMGJiTEJSIiwicHJvdG9jb2wiOiJ2bCIsIm1vZGUiOiJwcm94eWlwIiwicGFuZWxJUHMiOltdfQ%3D%3D%3Fed%3D2560#10",
          "vless://d0053266-13a2-488c-adb4-c5eecbf9cb72@104.18.40.185:443?encryption=none&security=tls&sni=j3do-r0ai1srkyg52dpx4zcdvy5dh9hf.ridam68232.workers.dev&fp=chrome&insecure=0&allowInsecure=0&type=ws&host=j3do-r0ai1srkyg52dpx4zcdvy5dh9hf.ridam68232.workers.dev&path=%2FeyJqdW5rIjoiTDV4N01iZnZmVlk2bWgiLCJwcm90b2NvbCI6InZsIiwibW9kZSI6InByb3h5aXAiLCJwYW5lbElQcyI6W119%3Fed%3D2560#11",
          "vless://b56b8e9c-b338-4d42-87c0-35ce808f41eb@216.24.57.250:8443?encryption=none&security=tls&sni=gorbahh.erfanhub.ir&fp=random&insecure=0&allowInsecure=0&type=ws&host=gorbahh.erfanhub.ir&path=%2Fproxyip%3D185.92.183.102%2C147.90.26.93%2C81.90.17.57#12",
          "vless://7bd180e8-1142-4387-93f5-03e8d750a896@wsabi.erfanhub.ir:443?encryption=none&security=tls&sni=test2145.wasmer.app&fp=chrome&insecure=0&allowInsecure=0&type=ws&host=test2145.wasmer.app&path=%2F7bd180e8#13"
  ],
  "3": [
        "vless://25b377e5-ae6d-43a4-b0ed-afea87612ef9@185.162.228.202:443?encryption=none&security=tls&sni=shrim.erfanfamily.ir&fp=chrome&insecure=0&allowInsecure=0&type=ws&host=shrim.erfanfamily.ir&path=%2FeyJqdW5rIjoiNnJtaUl1N2UxeTNZIiwicHJvdG9jb2wiOiJ2bCIsIm1vZGUiOiJwcm94eWlwIiwicGFuZWxJUHMiOltdfQ%3D%3D%3Fed%3D2560#8",
        "vless://25b377e5-ae6d-43a4-b0ed-afea87612ef9@159.246.55.248:443?encryption=none&security=tls&sni=shrim.erfanfamily.ir&fp=chrome&insecure=0&allowInsecure=0&type=ws&host=shrim.erfanfamily.ir&path=%2FeyJqdW5rIjoiNnJtaUl1N2UxeTNZIiwicHJvdG9jb2wiOiJ2bCIsIm1vZGUiOiJwcm94eWlwIiwicGFuZWxJUHMiOltdfQ%3D%3D%3Fed%3D2560#9",
        "vless://25b377e5-ae6d-43a4-b0ed-afea87612ef9@194.36.55.7:443?encryption=none&security=tls&sni=shrim.erfanfamily.ir&fp=chrome&insecure=0&allowInsecure=0&type=ws&host=shrim.erfanfamily.ir&path=%2FeyJqdW5rIjoiNnJtaUl1N2UxeTNZIiwicHJvdG9jb2wiOiJ2bCIsIm1vZGUiOiJwcm94eWlwIiwicGFuZWxJUHMiOltdfQ%3D%3D%3Fed%3D2560#10",
        "vless://02b1ea62-173d-43df-a566-6f0f65536e23@wsabi.erfanhub.ir:443?encryption=none&security=tls&sni=urmydreams.wasmer.app&fp=chrome&insecure=0&allowInsecure=0&type=ws&host=urmydreams.wasmer.app&path=%2F02b1ea62#81",
        "vless://4f330c55-87b3-4092-af79-be498c37846c@164.90.176.31:443?encryption=none&security=tls&sni=wr031vlkvbilaorzh8wdvbntp4bmpjlq.a6rwa13k.workers.dev&fp=chrome&insecure=0&allowInsecure=0&type=ws&host=wr031vlkvbilaorzh8wdvbntp4bmpjlq.a6rwa13k.workers.dev&path=%2FeyJqdW5rIjoiRDBFMGJiTEJSIiwicHJvdG9jb2wiOiJ2bCIsIm1vZGUiOiJwcm94eWlwIiwicGFuZWxJUHMiOltdfQ%3D%3D%3Fed%3D2560#82",
        "vless://d0053266-13a2-488c-adb4-c5eecbf9cb72@104.18.40.185:443?encryption=none&security=tls&sni=j3do-r0ai1srkyg52dpx4zcdvy5dh9hf.ridam68232.workers.dev&fp=chrome&insecure=0&allowInsecure=0&type=ws&host=j3do-r0ai1srkyg52dpx4zcdvy5dh9hf.ridam68232.workers.dev&path=%2FeyJqdW5rIjoiTDV4N01iZnZmVlk2bWgiLCJwcm90b2NvbCI6InZsIiwibW9kZSI6InByb3h5aXAiLCJwYW5lbElQcyI6W119%3Fed%3D2560#83",
        "vless://b56b8e9c-b338-4d42-87c0-35ce808f41eb@216.24.57.250:8443?encryption=none&security=tls&sni=gorbahh.erfanhub.ir&fp=random&insecure=0&allowInsecure=0&type=ws&host=gorbahh.erfanhub.ir&path=%2Fproxyip%3D185.92.183.102%2C147.90.26.93%2C81.90.17.57#84",
        "vless://7bd180e8-1142-4387-93f5-03e8d750a896@wsabi.erfanhub.ir:443?encryption=none&security=tls&sni=test2145.wasmer.app&fp=chrome&insecure=0&allowInsecure=0&type=ws&host=test2145.wasmer.app&path=%2F7bd180e8#85"
  ],
  "4": [
        "vless://14e28b36-9a4d-40a4-9aff-fb63163c74f4@185.162.228.202:443?encryption=none&security=tls&sni=test1200.erfanhub.ir&fp=chrome&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=test1200.erfanhub.ir&path=%2Fpyip%3Dprx.erfanfamily2.ir#8",
        "vless://14e28b36-9a4d-40a4-9aff-fb63163c74f4@159.246.55.248:443?encryption=none&security=tls&sni=test1200.erfanhub.ir&fp=chrome&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=test1200.erfanhub.ir&path=%2Fpyip%3Dprx.erfanfamily2.ir#9",
        "vless://e4f3bd9d-cace-4816-8b7d-2cd58fdeea44@172.67.65.146:2096?encryption=none&security=tls&sni=test66698.erfnmndi343-e4b.workers.dev&fp=chrome&insecure=0&allowInsecure=0&type=ws&host=test66698.erfnmndi343-e4b.workers.dev&path=%2F#81",
        "vless://fa7cb5a1-b713-40eb-b6cd-45b6b5095841@wsabi.erfanhub.ir:443?encryption=none&security=tls&sni=lololowe.wasmer.app&fp=chrome&insecure=0&allowInsecure=0&type=ws&host=lololowe.wasmer.app&path=%2Ffa7cb5a1#82",
        "vless://fa7cb5a1-b713-40eb-b6cd-45b6b5095841@44.32.235.22:443?encryption=none&security=tls&sni=spring.erfnmndi343-e4b.workers.dev&fp=chrome&alpn=http%2F1.1&insecure=0&allowInsecure=0&type=ws&host=spring.erfnmndi343-e4b.workers.dev&path=%2FutvIMOF9bFmD%3Fed%3D2048#83",
        "vless://fa7cb5a1-b713-40eb-b6cd-45b6b5095841@wsabi.erfanhub.ir:443?encryption=none&security=tls&sni=popoweqf.wasmer.app&fp=chrome&insecure=0&allowInsecure=0&type=ws&host=popoweqf.wasmer.app&path=%2Ffa7cb5a1#84"
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
    s.sockopt.dialerProxy = "fragment";
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
        fragment: { packets: "1-1", length: "100-200", interval: "20-30" },
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
