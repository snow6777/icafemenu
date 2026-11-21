// 远程化改造（分支 B）：浏览器自己连 wss，取代原生 CWssClient/ServiceWss（那套原生实现在分支 A 下保留不变，
// 只是这份代码永远不会调用它 —— 分支 B 页面自己完成登录和协议收发）。
//
// 移植自 api/html/js/wss.js 的 WssClient（CP 管理端用的那份），针对 icafemenu 客户端场景做了裁剪：
//   - 只保留 asClient() 登录模式（去掉 asServer/asWeb，那些是 iCafeCloud Server/CP 用的登录方式）
//   - 登录包新增 t/sid（main.htm 自举时从 gamecenter.php 拿到的服务端签发凭证），不带 admin_pwd
//     （服务端那边的校验早就被注释掉了，见迁移计划里的说明，这里就不传了）
//   - 收到的每条消息都通过 ICAFEMENU_CORE.dispatchWssPacket() 派发成 _wss_${action} 系列 CustomEvent，
//     listen.js/apiclient.js 完全不用关心消息是原生转发来的还是这里直接收的
//   - login 失败带新分片、以及 kick_out，原生实现里这两种情况从来不转发给 JS（原生自己处理掉了），
//     现在原生不再持有 wss 连接，改由这里处理：整页跳转到正确的分片，或者重新加载页面

function WssClient() {
	var that = this;
	this.socket = null;
	this.host = null;

	this.loginFields_ = null; // 静态字段（icafe_id/pc_name/ip/mac/t/sid），登录包在每次实际发送时才动态组装
	this.pendingPassword_ = null; // 收到 need_credentials 后由 retryWithCredentials() 填入，账号不需要用户输入
	this.isLogined_ = false;
	this.isLoginFailed_ = false;
	// 跟原生（分支 A，ServiceWss.cpp 里 m_nWssConnectInterval 同样默认 60）保持一致的默认值，
	// 优先读 theSettings.wss_connect_interval（icafe.js 里的配置），未配置时兜底 60
	this.wss_connect_interval = (typeof theSettings !== 'undefined' && theSettings.wss_connect_interval) || 60;

	this.asClient = function (icafe_id, pc_name, ip, mac, t, sid) {
		if (!pc_name || !ip || !mac || !t || !sid) {
			console.log('wss-client: asClient() missing required fields');
			return;
		}

		that.loginFields_ = { icafe_id: String(icafe_id), pc_name: pc_name, ip: ip, mac: mac, t: t, sid: sid };
	}

	// 登录包不能像过去那样一次性 JSON.stringify 缓存好——status_pc_token 是会员登录之后才产生的，
	// 如果只在 asClient() 时序列化一次，之后网络抖动重连发的还是最早那份空 token 的包，永远无法命中
	// 服务端的"token 匹配则视为同一会话重连"判断。必须每次发送前现读 thePCStatus.status_pc_token。
	this.buildLoginPacket = function () {
		var f = that.loginFields_ || {};
		var status_pc_token = (typeof thePCStatus !== 'undefined' && thePCStatus && thePCStatus.status_pc_token) || '';
		var data = {
			icafe_id: f.icafe_id, type: 'client', name: f.pc_name, ip: f.ip, mac: f.mac, t: f.t, sid: f.sid,
			status_pc_token: status_pc_token
		};
		if (that.pendingPassword_) {
			data.member_password = that.pendingPassword_;
		}
		return { action: 'login', version: 2, type: 'request', from: 'client', target: 'wss-server', data: data };
	}

	// 服务端要求补充密码验证身份（status_pc_token 不匹配）时，UI 收集到密码后调用这个方法：账号不需要
	// 用户输入，服务端已经知道这台 PC 当前绑定的是哪个会员，只验证密码。不需要重新建立连接，登录失败时
	// 服务端并不会关闭 socket，直接在同一条连接上再发一次 login 请求即可
	this.retryWithCredentials = function (member_password) {
		that.pendingPassword_ = member_password;
		that.send(JSON.stringify(that.buildLoginPacket()));
	}

	// PC 空闲、还没有会员在线时（wsclassclient.php 的 needsGate 不生效）被人抢注了这条连接的身份，wss 层面
	// 拿不到任何凭证去踢回来；但用户随后走 REST memberLogin 成功登录后，服务端已经把这个会员写进
	// table_pc_status，此时带着刚才登录用的密码重连一次 wss，会命中 needsGate 的密码校验分支，把冒充者
	// 挤下线——不依赖 status_pc_token 是否已经在本地同步好这种时序问题，直接把登录时已经拿到的明文密码带
	// 上，一个来回就能确定性地拿回连接。跟 retryWithCredentials 的区别是这里不能假设还有一条打开的 socket
	// （之前可能已经被 kick_out 关掉），要整个重新 connect()；同时要重置 isLoginFailed_——这次重连是由用户
	// 真实登录动作触发的，不是自动重试，不应该被之前那次 kick_out 遗留的标志位挡住，重置后如果这条新连接
	// 之后又因为正常网络抖动断开，onclose 的自动重连逻辑能照常生效。
	this.reconnectWithPassword = function (member_password) {
		that.pendingPassword_ = member_password;
		that.isLoginFailed_ = false;
		that.connect();
	}

	this.isLogined = function () {
		return that.isLogined_;
	}

	this.connect = function () {
		if (!that.loginFields_) {
			console.log('wss-client: login fields not set, call asClient() first');
			return;
		}

		var url = (window.location.hostname == 'localhost') ? 'ws://127.0.0.1:2346' : ('wss://' + window.location.hostname + '/wss');
		that.host = that.host || url;

		// 每次真正建立新连接（初次连接、或断线后重连）都视为一次全新的登录尝试，之前在旧连接上
		// 收集到的密码不应该被继续携带——重连本身多半是网络抖动，token 应该能直接匹配；如果
		// 服务端认为还是需要验证身份，会重新推 need_credentials，届时再让用户重新输入
		that.pendingPassword_ = null;

		// 不在这里重置 isLoginFailed_：这个标志一旦被 kick_out/login 失败置为 true，就必须一直保持到页面
		// 跳转/reload 为止。之前在这里无条件重置过，若 kick_out 恰好发生在"onclose 触发→排队等待重连"的
		// 窗口期内，定时器到点后 connect() 会把标志清空、重新建立连接，而这个新连接一登录又会触发服务端
		// register() 里"踢掉同 key 其它连接"的逻辑，形成两个连接互相踢的死循环。
		that.socket = new WebSocket(that.host);

		that.socket.onopen = function () {
			console.log('[' + new Date().toLocaleTimeString() + '] wss open, host: ' + that.host + ', send login cmd');
			that.send(JSON.stringify(that.buildLoginPacket()));
		}

		that.socket.onerror = function (event) {
			console.log('[' + new Date().toLocaleTimeString() + '] wss connect error: ', event);
		}

		that.socket.onclose = function () {
			that.isLogined_ = false;
			// 分片跳转 / 被踢的场景不需要重连，页面马上就要跳转或重新加载了
			if (that.isLoginFailed_)
				return;
			var reconnTime = Math.floor(Math.random() * that.wss_connect_interval * 1000);
			console.log('[' + new Date().toLocaleTimeString() + '] wss close, retry in ' + Math.floor(reconnTime / 1000) + 's');
			setTimeout(function () {
				// 重连前查 gamecenter.php：
				// 1. 分片迁移后旧 host 完全下线时可以探测到新 LSC 并跳转，不会一直打死机服务器
				// 2. 顺便刷新 t/sid，防止长时间断线后用过期凭证登录被拒、isLoginFailed_ 置 true、永久停止重连
				var b = window.theBootstrap || {};
				if (window.location.hostname === 'localhost' || !b.icafe_id) {
					that.connect();
					return;
				}
				// 与 C++ GetServerCode() 保持一致：依次尝试当前分片 → cp → cp2，
				// 任一成功即止；当前分片整台挂掉时可从 cp/cp2 拿到新 LSC
				var currentCode = window.location.hostname.split('.')[0].toLowerCase();
				var gcHosts = [];
				if (currentCode !== 'cp' && currentCode !== 'cp2') gcHosts.push(currentCode);
				gcHosts.push('cp', 'cp2');
				(function tryHost(i) {
					if (i >= gcHosts.length) { that.connect(); return; }
					var gcUrl = 'https://' + gcHosts[i] + '.icafecloud.com/api/gamecenter.php?action=servercode&icafe_id=' + encodeURIComponent(b.icafe_id) + '&format=json';
					fetch(gcUrl, { cache: 'no-cache' })
						.then(function (r) { return r.json(); })
						.then(function (boot) {
							if (!boot || !boot.license_server_code) { tryHost(i + 1); return; }
							if (boot.license_server_code.toLowerCase() !== currentCode) {
								that.redirectToShard(boot.license_server_code);
								return;
							}
							// 分片一致：刷新 t/sid 供下次登录包使用
							if (boot.t && boot.sid && that.loginFields_) {
								that.loginFields_.t = boot.t;
								that.loginFields_.sid = boot.sid;
							}
							that.connect();
						})
						.catch(function () { tryHost(i + 1); });
				}(0));
			}, reconnTime);
		}

		that.socket.onmessage = function (event) {
			var packet;
			try {
				packet = JSON.parse(event.data);
			} catch (e) {
				return;
			}
			if (!packet.version || packet.version != 2)
				return;

			if (packet.action == 'login') {
				if (packet.status == 'success') {
					that.isLogined_ = true;
					that.pendingPassword_ = null;
					console.log('[' + new Date().toLocaleTimeString() + '] wss login success');
				} else {
					that.isLogined_ = false;
					var reason = packet.data && packet.data.reason;
					if (reason == 'need_credentials') {
						// status_pc_token 不匹配（PC 重启/陌生连接），服务端要求补充账号密码验证身份。
						// 不关闭连接、不阻止自动重连——万一等待用户输入期间连接自己断了，正常重连即可，
						// 重连时 token 依然不匹配的话服务端会再推一次这个事件
						console.log('[' + new Date().toLocaleTimeString() + '] wss login needs credentials');
						window.dispatchEvent(new CustomEvent('wss_need_credentials', { detail: packet }));
						return; // 不落入下面的 dispatchWssPacket：这是登录失败，不能让 listen.js 的 login.response 成功处理逻辑误触发
					} else if (reason == 'denied') {
						// 密码验证失败次数超过节流限制，需柜台在 CP 端 Checkout 后才能解除，不再自动重试
						that.isLoginFailed_ = true;
						console.log('[' + new Date().toLocaleTimeString() + '] wss login denied (rate limited)');
						window.dispatchEvent(new CustomEvent('wss_login_denied', { detail: packet }));
						return; // 同上，避免误触发 login.response 的成功处理逻辑
					} else {
						that.isLoginFailed_ = true;
						console.log('[' + new Date().toLocaleTimeString() + '] wss login failed');
						if (packet.data && packet.data.license_server_code) {
							that.redirectToShard(packet.data.license_server_code);
							return;
						}
					}
				}
			}

			if (packet.action == 'kick_out') {
				that.isLoginFailed_ = true; // 阻止 onclose 里自动重连
				console.log('[' + new Date().toLocaleTimeString() + '] wss kick_out');
				// 主动断开，不等服务端来关，避免这条已经被判定下线的连接继续占用/收发消息
				if (that.socket) that.socket.close();
				if (packet.data && packet.data.license_server_code) {
					that.redirectToShard(packet.data.license_server_code);
				} else {
					// 分片一致时不整页 reload（那等价于自动重连，"PC 空闲、两个进程用同一身份同时连接"
					// 场景下会跟对方形成循环互踢，是最初 isLoginFailed_ 那个修复要防的同一类问题）。
					// 但页面要给出明确反馈，不能让用户对着一个已经断线、无法使用的界面：退回登录页。
					// 走 theSession.logout_session()（不会触发 wss 重连，不影响上面的循环互踢防护）而不是
					// 直接调 theLogin.show_login_page('login')：后者不会清空 thePCStatus.member_account，
					// show_login_page 内部随后跑的 unlock_pc() 会拿这个残留的"仍在登录"状态误按
					// license_show_client_mode 把刚设好的全屏窗口又改回去；logout_session() 先把状态喂给
					// wss_client_status() 走一遍完整流程，thePCStatus 更新之后才展示登录页，同时也避免了
					// 后续真正的 client_status 推送到达时把登录页逻辑再重复触发一次。
					// 未登录时（PC 空闲被踢是常态）logout_session() 内部只保证页面停在登录页，不走 wss_client_status。
					theSession.logout_session();
				}
				// 不 return：仍然继续往下走 dispatchWssPacket，让页面有机会先展示提示信息
			}

			// ICAFEMENU_CORE 是 core.js 里顶层 const 声明的绑定（跟 OnCommand/theApiClient 同理），不是 window
			// 的属性；写成 window.ICAFEMENU_CORE 这个判断恒为 false，dispatchWssPacket 永远不会被调用，且不抛
			// 异常、不留日志，完全静默——之前 client_status 消息到达但界面无响应，根因就在这一行。
			if (typeof ICAFEMENU_CORE !== 'undefined' && ICAFEMENU_CORE.dispatchWssPacket) {
				ICAFEMENU_CORE.dispatchWssPacket(packet);
			}
		}
	}

	// 服务端告诉我们这个 icafe_id 实际归属另一个分片时，带上原有的自举参数整页跳转过去
	// （跟 main.htm 自举流程里分片不一致时的兜底逻辑是同一套参数）
	this.redirectToShard = function (newCode) {
		var b = window.theBootstrap || {};
		// newCode 跟本页引导时已确认的分片相同，说明是过期/重复的重定向信号（比如短暂的分片迁移状态
		// 抖动），此时整页跳转只是重新加载同一个 URL，没有意义，还会跟"跳转后又收到一次相同信号"
		// 形成不必要的反复刷新
		if (b.license_server_code && String(b.license_server_code) === String(newCode)) {
			console.log('[' + new Date().toLocaleTimeString() + '] wss redirectToShard: already on ' + newCode + ', skip');
			return;
		}
		// ts 用当前时间戳保证跳转后的 URL 每次都不同，main.htm 是静态文件、响应头没有 Cache-Control，
		// 不带这个会被 CEF/浏览器磁盘缓存吃到旧版本
		var query = new URLSearchParams({ icafe_id: b.icafe_id || '', pc_name: b.pc_name || '', mac: b.mac || '', ip: b.ip || '', ts: Date.now() }).toString();
		window.location.href = 'https://' + newCode + '.icafecloud.com/client/main.htm?' + query;
	}

	this.quit = function () {
		if (that.socket != null) {
			that.isLoginFailed_ = true; // 阻止自动重连
			that.socket.close();
			that.socket = null;
		}
	}

	this.send = function (text) {
		if (!that.socket || that.socket.readyState != WebSocket.OPEN) {
			console.log('[' + new Date().toLocaleTimeString() + '] wss send failed: not connected');
			return false;
		}
		try {
			that.socket.send(text);
			return true;
		} catch (ex) {
			console.log('[' + new Date().toLocaleTimeString() + '] wss send failed: ' + ex);
			return false;
		}
	}
}
