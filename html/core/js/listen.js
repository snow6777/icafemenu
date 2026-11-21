// -- CLIENT start --
// 1. client wss connected
// 2. client send login package to server
// 2. server send login + settings package to client (assign to theSettings)
// 3. server send client_status package to client (assign to thePCStatus)

// -- CLIENT login --
// 1. client send member_login package to server
// 2. server send client_status package to client

// -- TIME over --
// 1. client send auto_checkout package to server (countdown())
// 2. server send client_status package to client

// -- click CHECKOUT --
// 1. client send request_checkout package to server
// 2. server send client_status package to client

// -- session start/checkout, add time, add offer, topup member, add order using balance on CP --
// 1. server send client_status package to client

// 会话被柜台暂停时的锁屏状态快照 {mode, locked}，恢复时原样还回去：客人可能自己用锁屏密码锁了机，
// 不能因为柜台暂停又恢复，就顺手把客人自己的锁解开。只有本文件读写、不参与模板渲染，所以不放 vueGlobal。
var theLockBeforePause = null;

// 暂停锁屏上的说明文案。故意由 JS 插进锁屏页，而不是写在各主题的 layout.htm 里：core/js 是所有主题
// 共用的，写在 HTML 就得每个主题各抄一份，漏抄的主题暂停时只剩一块空白锁屏，客人不知道找谁。
// 各主题锁屏页都有 #page_lock .unlock-form-div 这个容器，它本身没有 petite-vue 指令，里面的 v-if 块
// (user/maintenance/station_lock) 靠注释锚点各自插拔，往末尾追加的节点不会被重渲染冲掉。
// class 与 maintenance / station_lock 两块保持一致，外观交给各主题自己的 CSS。
function show_paused_lock_message() {
	if (document.getElementById('paused-lock-msg'))
		return;
	var box = document.querySelector('#page_lock .unlock-form-div') || document.getElementById('page_lock');
	if (!box)
		return;
	var el = document.createElement('div');
	el.id = 'paused-lock-msg';
	el.className = 'd-flex flex-column align-items-center';
	el.innerHTML = '<i class="fal fa-pause-circle fa-3x text-info mb-4"></i>'
		+ '<h2 class="text-center mb-3"></h2>'
		+ '<p class="text-center text-warning"></p>';
	el.querySelector('h2').innerText = translate_string('Session Paused');
	el.querySelector('p').innerText = translate_string('Your session is paused and is not being charged. Please contact staff to resume.');
	box.appendChild(el);
}

function hide_paused_lock_message() {
	var el = document.getElementById('paused-lock-msg');
	if (el)
		el.parentNode.removeChild(el);
}

// WSS 消息分发中枢：注册全部 WSS/原生命令处理器，处理 client_status 推送。跟其它 core/js 文件
// （Home/Shop/Game/Rank...）统一做成构造函数，theListen 在 main.js 里实例化，
// registerWssHandlers()/registerExeCommandHandlers() 由 initApp() 显式调用。
function Listen() {
	var that = this;

	// 预约倒计时计时器
	this.bookingCountdownTimerId = null;

	// 注册全部 WSS 消息处理器。原来是裸的顶层链式调用，脚本一加载就自己执行，main.js 的 initApp()
	// 完全看不出这里还做了这么多注册工作；改成命名函数、由 initApp() 显式调用，开机时"做了什么"能从
	// initApp() 一路读下来，不用另外知道 listen.js 会在加载时自己跑一段注册代码。
	this.registerWssHandlers = function() {
		ICAFEMENU_CORE.onWss('remind', ({ data }) => {
			if (!data || !data.message) return;
		// 限时 postpaid 时长到点：退回登录页停止服务，并告诉客人去柜台付款。
		// logout_session() 只改客户端本地状态（走一遍 wss_client_status 的未登录分支），
		// 不会通知服务端结账——服务端的 table_pc_status 行仍在，钱由收银员当面收完后在 CP 上手动
		// checkout。不另做一套锁屏页：logout 之后走到的 show_login_page() 本身就会下
		// LOCK 65535 + 全屏置顶，客人已经什么都干不了了。
		}).onWss('postpaid_expired', () => {
			toast(translate_string('Your session time has ended. Please go to the counter to pay.'), 'warning');
			theSession.logout_session();
		// 旧 Send message 对话框(main.htm/members.htm wss.send_packet_ex):弹 toastr 通知
		}).onWss('admin_message', ({ data }) => {
			var fromRaw = (data.from || '').replace(/^staff-/, '').replace(/^member-/, '');
			toastr.options.tapToDismiss = true;
			toastr.options.timeOut = 0;
			toastr.options.extendedTimeOut = 0;
			toastr.info(htmlToText(data.message || data.text || ''), translate_string('Message from ') + fromRaw, {
				toastClass: 'custom-transparent-toast'
			});
			var license_lang = theSettings.license_lang ?? '';
			var supportedLangs = ['ar', 'es', 'mn', 'ru', 'tr_TR'];
			license_lang = supportedLangs.includes(license_lang) ? (license_lang + '/') : '';
			ICAFEMENU_CORE.playSound(['customized/admin-message.wav', license_lang + 'admin-message.wav']);
		// 新 livechat (ChatController::send):直接走聊天抽屉，不弹 toastr
		}).onWss('chat_message', ({ data }) => {
			if (data && data.type === 'read_receipt') {
				if (window.theChat && typeof window.theChat.onReadReceipt === 'function')
					window.theChat.onReadReceipt(data);
				return;
			}
			var muted = !!(window.theChat && window.theChat.mute);
			var alreadyViewing = !!(window.theChat && typeof window.theChat.isViewing === 'function' && window.theChat.isViewing(data.from));
			if (!muted && !alreadyViewing) {
				var license_lang = theSettings.license_lang ?? '';
				var supportedLangs = ['ar', 'es', 'mn', 'ru', 'tr_TR'];
				license_lang = supportedLangs.includes(license_lang) ? (license_lang + '/') : '';
				ICAFEMENU_CORE.playSound(['customized/admin-message.wav', license_lang + 'admin-message.wav']);
			}
			if (window.theChat && typeof window.theChat.onIncomingMessage === 'function')
				window.theChat.onIncomingMessage(data);
		}).onWss('quit,exit', () => {
			unlock_all();
			ICAFEMENU_CORE.sendCommandToExe("EXIT");
		}).onWss('shutdown', () => {
			unlock_all();
			ICAFEMENU_CORE.sendCommandToExe("SHUTDOWN ONLY");
		}).onWss('reboot', () => {
			unlock_all();
			ICAFEMENU_CORE.sendCommandToExe("SHUTDOWN REBOOT");
		}).onWss('logoff', () => {
			unlock_all();
			ICAFEMENU_CORE.sendCommandToExe("SHUTDOWN REBOOT");
		// novnc_start/novnc_stop 只有原生 ServiceWss.cpp 里有处理逻辑（拉起本机 tvnserver.exe）。分支 B 下
		// wss 连接是浏览器自己连的（core.js 的 wssStart()），原生 theWss 不会启动，这两条消息不转发到原生
		// 就会被静默丢弃——收到后转发给原生的 NOVNC_START/NOVNC_STOP 桥接执行，跟分支 A 效果一致
		}).onWss('novnc_start', ({ data }) => {
			ICAFEMENU_CORE.sendCommandToExe('NOVNC_START ' + JSON.stringify(data || {}));
		}).onWss('novnc_stop', () => {
			ICAFEMENU_CORE.sendCommandToExe('NOVNC_STOP');
		// send_to_vnc 是 novnc_start/novnc_stop 握手之后持续的双向二进制画面数据流，同样只有原生
		// ServiceWss.cpp（分支 A 下的 CWssClient::RecvCommand()）在处理，分支 B 下这条流也要转发给原生的
		// VNC 数据桥接线程（见 ServiceWss.cpp 的 HandleVncBridgeData），不然 tvnserver.exe 起来了但画面
		// 传不出去——跟 NOVNC_START/NOVNC_STOP 是同一套桥接思路，只是这条是高频双向的
		}).onWss('send_to_vnc', ({ data }) => {
			ICAFEMENU_CORE.sendCommandToExe('NOVNC_DATA ' + JSON.stringify(data || {}));
		// task_list/task_kill（CP 的 Task manager）同样只有原生 ServiceWss.cpp 里有处理逻辑，
		// 分支 B 下要转发给原生的 CallFunction("TASK_LIST"/"TASK_KILL")，跟 novnc_start/stop 同一套桥接思路
		}).onWss('task_list', () => {
			ICAFEMENU_CORE.sendCommandToExe('TASK_LIST');
		}).onWss('task_kill', ({ data }) => {
			ICAFEMENU_CORE.sendCommandToExe('TASK_KILL ' + JSON.stringify(data || {}));
		// admin_mode（CP 右键菜单"Admin mode"）分支 A 下原生收到后直接退出 iCafeMenu 进程，让员工能碰到
		// 桌面；分支 B 下这条消息同样只在 ServiceWss.cpp 里有处理逻辑，之前没转发会被静默丢弃，进程根本
		// 不退出。EXIT 是已有的通用退出指令（quit/exit 也在用，见上面），不需要新增原生代码；response
		// 的 status/message 是包级顶层字段，CP 端其实没读（admin_mode 是 fire-and-forget），仍按分支 A
		// 的响应格式发一份，保持行为对齐
		}).onWss('admin_mode', () => {
			ICAFEMENU_CORE.sendCommandToExe('EXIT');
			if (window.theWssClient && window.theWssClient.isLogined()) {
				window.theWssClient.send(JSON.stringify({
					action: 'admin_mode', type: 'response', target: 'web', from: 'client', version: 2,
					status: 'success', message: '',
					data: { pc_name: thePCInfo.pc_name }
				}));
			}
		}).onWss('payment_qr', ({ data }) => {
			// 带了 pc_name 就必须是本机的才处理。portal / kiosk 付款产生的回调里 pc_name 是空串或
			// 'kiosk'，不能让整个网吧的客户端都跟着弹成功提示。
			// 比较必须忽略大小写：WSS 那边派发本来就是按 strtolower 匹配的（inc.php 的
			// wss_send_to_client），大小写不一致的 order_pc 会让这条消息被错误丢弃。
			if (data.pc_name && String(data.pc_name).toLowerCase() != String(thePCInfo.pc_name).toLowerCase()) {
				return;
			}

			// 自助注册买新会员套餐：付款到账只是把扫码弹窗换成注册表单，会员这时候还没建，
			// 不该弹"购买成功"、也不该去关别的弹窗。轮询那条路走的是同一个 on_offer_paid()，幂等。
			// 判据只看相位、不看扫码弹窗是否开着：顾客可能已经把它关了（标题栏有 ×），
			// 但轮询还活着、钱也照样会到账，这时候更要把他领回表单。
			if (vueRegister.phase === 'qr'
				&& (!data.order_no || String(data.order_no) == String(vueRegister.claim_order_no))) {
				theMemberRegister.on_offer_paid(data.order_no);
				return;
			}

			let currency = data.currency || '';
			let msg = '';
			let details = '';
			if (data.type === 'topup') {
				msg = translate_string('Topup Successful!');
				if (data.topup_amount) {
					details += `<br>${translate_string('Topup Amount')}: ${currency} ${data.topup_amount}`;
				}
				if (data.new_balance) {
					details += `<br>${translate_string('Balance')}: ${currency} ${data.new_balance}`;
				}
			} else if (data.type === 'offer' || data.type === 'product') {
				msg = data.type === 'offer' ? translate_string('Offer Purchase Successful!') : translate_string('Product Purchase Successful!');
				if (data.items && data.items.length > 0) {
					data.items.forEach(item => {
						details += `<br>${item.name} x${item.qty} — ${currency} ${parseFloat(item.money).toFixed(2)}`;
					});
				}
				if (data.order_total) {
					details += `<br><b>${translate_string('Total')}: ${currency} ${data.order_total}</b>`;
				}
			} else {
				msg = translate_string('Payment Successful!');
			}
			// 充值到账可能刚赚到抽奖机会, 立刻刷新入口徽章, 免得会员充完钱看按钮没动静
			if (data.type === 'topup' && typeof theSpinWheel !== 'undefined') {
				theSpinWheel.refreshRemaining();
			}
			if (data.member_group_id == MEMBER_GROUP_PREPAID) {
				vueGlobal.modals.topupLogin = false;
			} else {
				vueGlobal.modals.topup = false;
				vueGlobal.modals.buy = false;
			}
			try { swal.close(); } catch(e) {}
			setTimeout(() => sweetAlert({ title: "", text: msg + details, html: true, type: "success" }), 300);
			if (theShopPrint._pendingQrOrder) {
				const pendingPrint = theShopPrint._pendingQrOrder
				theShopPrint._pendingQrOrder = null
				ICAFEMENU_CORE.sendCommandToExe("PROCESS_PRINT_PDF " + pendingPrint.order_no)
				ICAFEMENU_CORE.wsssend('print', 'request', 'server', { order_no: pendingPrint.order_no, pc_name: thePCInfo.pc_name, is_color: pendingPrint.is_color });
			}
		}).onWss('refresh_offers', () => {
			// CP 端 Confirm 订单后的定向刷新（见 OrdersController::confirmBase）。只重拉 offer 列表，不动
			// thePCStatus 其它字段——会员还没开机时服务端没有 table_pc_status 行，推 client_status 过来
			// 反而会把 start-session 页已有的状态冲掉。
			// 不校验身份：fetch_available_offers 拿本机自己的 member token 去拉，只会拉到当前登录会员自己的
			// offer，PC 上换了人也串不了数据。
			// force_remount=true：面板这时候可能已经开着（会员正看着 My Offers），数据在背后被换掉，
			// 光改 thePCStatus.available_offers 不会触发视图更新，需要强制重新挂载一次。
			if (typeof theStartSession !== 'undefined') theStartSession.fetch_available_offers(true);
		}).onWss('member_login.response', packet => {
			if (packet.status == 'error') {
				// 同 WSS_LOGIN_FAILED：不能裸调 show_login_page（不清 thePCStatus，末尾的 unlock_pc() 会撤锁）
				theSession.logout_session();
				sweetAlert("", translate_string(packet.data?.message), "error");
			}
		}).onWss('scan_status', ({ data }) => {
			// app 扫码各阶段状态：scanned（已扫描待确认）/ approved（已授权登录中）/ cancelled（已取消）
			// 仅认当前二维码的 code，忽略过期/旧码串扰
			if (!data || data.code !== theScanLogin.code) return;
			vueScanLogin.status = data.status || '';
			if (data.status === 'scanned') {
				vueScanLogin.statusText = translate_string('Scanned, confirm on your phone');
			} else if (data.status === 'approved') {
				vueScanLogin.statusText = translate_string('Authorized, logging in');
				if (!theScanLogin._loggingIn) {
					theScanLogin._loggingIn = true;
					theApiClient.scanMemberLogin(theScanLogin.code, theCafe.license_name, thePCInfo.pc_name)
						.then(info => { if (info) theLogin.handleLoginSuccess(info, (info.member && info.member.member_account) || ''); })
						.catch(ICafeApiError.show)
						.finally(() => { theScanLogin._loggingIn = false; });
				}
			} else if (data.status === 'cancelled') {
				vueScanLogin.statusText = translate_string('Cancelled, tap to refresh');
			} else {
				vueScanLogin.statusText = '';
			}
		}).onWss('member_bind_status', ({ data }) => {
			// 只认当前二维码的 code；与 scan_status 是两条独立链路，勿合并
			if (!data || data.code !== theMemberBind.code) return;
			vueMemberBind.status = data.status || '';
			if (data.status === 'scanned') {
				vueMemberBind.statusText = translate_string('Scanned, confirm on your phone');
			} else if (data.status === 'bound') {
				vueMemberBind.statusText = translate_string('Linked successfully');
				vueMemberBind.boundEmail = data.icafe_user_email || '';
				theMemberBind.stop();      // 不停表的话 120s 后成功态会被 expired 覆盖
				theMemberBind.code = null;
				// 绿罩先给即时反馈，1.5s 后切成已绑定态。直接用推送里的邮箱，不再打一次接口，
				// 免得又转一圈 spinner；昵称和绑定时间下次打开弹窗时补齐
				setTimeout(function () {
					if (!vueGlobal.modals.bindApp) return;
					vueMemberBind.status = '';
					vueMemberBind.boundName = '';
					vueMemberBind.boundAt = '';
					vueMemberBind.checking = false;
					vueMemberBind.bound = true;
				}, 1500);
			} else if (data.status === 'cancelled') {
				vueMemberBind.statusText = translate_string('Cancelled, tap to refresh');
			} else if (data.status === 'failed') {
				vueMemberBind.statusText = translate_string(data.message || 'Link failed');
			} else {
				vueMemberBind.statusText = '';
			}
		}).onWss('event_join_status', ({ data }) => {
			// App 扫静态码加入活动成功，刷新列表并关掉二维码窗口
			if (!data || data.status !== 'joined') return;
			theEventJoinQr.onJoined();
		}).onWss('login.response', () => {
			// wss 登录成功（含 status_pc_token/账号密码校验通过的场景）：关掉"验证身份以继续"弹窗，清理其状态。
			// 弹窗未开时这几行是无操作，不影响其它登录路径
			if (vueGlobal.modals.verifyIdentity) {
				vueGlobal.modals.verifyIdentity = false;
				vueLogin.verify_message = '';
				vueLogin.verify_denied = false;
			}
			theSettings.login_count = theSettings.login_count || 0;
			theSettings.login_count++
			if (theSettings.login_count > 1) {
				return
			}
			vueGlobal.currency = typeof (theSettings.currency) == 'undefined' ? '$' : theSettings.currency;
			vueGlobal.showOffersDiv = false;
			if (theSettings.license_using_billing == 0) {
				vueGlobal.menuButton.logout = false;
				vueGlobal.menuButton.feedback = false;
				vueGlobal.menuButton.assist = false;
				vueGlobal.menuButton.changepassword = false;
			}
			if (theSettings.license_using_billing == 1) {
				vueGlobal.menuButton.logout = true;
				vueGlobal.menuButton.feedback = true;
				vueGlobal.menuButton.assist = true;
			}
			if (!theIsHomeVersion && theSettings.license_using_billing == 1)
				vueGlobal.showOffersDiv = true;

			// first connect, set timeout for idle shutdown (don't move below codes to any where)
			if (!theIsHomeVersion && !theApiClient.isLogined() && theSettings.client_idle_mins > 0) {
				if (theIdleMonitorTimerId != null) {
					clearTimeout(theIdleMonitorTimerId);
					theIdleMonitorTimerId = null;
				}
				theIdleMonitorTimerId = setTimeout(function () {
					if (['run_checkout', 'run'].includes(theSettings.client_idle_action.toLowerCase())) {
						ICAFEMENU_CORE.sendCommandToExe('RUN run.bat');
					}

					if (['shutdown_checkout', 'shutdown'].includes(theSettings.client_idle_action.toLowerCase())) {
						unlock_all();
						ICAFEMENU_CORE.sendCommandToExe("SHUTDOWN ONLY");
					}
				}, theSettings.client_idle_mins * 1000 * 60);
			}
		}).onWss('client_status', packet => {
			that.wss_client_status(packet)
		}).onWss('*', (packet) => {
			if (packet.status != 'error') return;
			if (packet.action == 'member_login') return;
			sweetAlert("", translate_string(packet.data?.message), "error");
		});
	}

	this.requestApiToken = async function() {
		if (!thePCStatus.status_pc_token) {
			return null;
		}
		// 表单/扫码/访问码登录都会先各自调用一次登录接口写好 token，wss_client_status 收到 client_status
		// 推送确认登录后又会走到这里再调一次 memberLogin——两次登录同名 token 后端会撤销旧的签发新的，
		// 如果表单登录写入的 token 这时候正被别的请求使用（比如刚登录就买了个 offer），会被这次“重复登录”
		// 撤销掉，导致那个请求到达服务器时 401。账号一致就说明本地已经有这个人刚登录/仍在使用的 token，
		// 直接复用，不用再触发一次登录（token 有效期很长，不需要额外判断时间新鲜度）
		const existing = theApiClient.getMemberInfo();
		if (existing?.token && (existing?.member?.member_account || '').toLowerCase() === (thePCStatus.member_account || '').toLowerCase()) {
			vueGlobal.showOrderList = true;
			return existing.token;
		}
		let toknInfo = await theApiClient.memberLogin(thePCStatus.member_account, thePCStatus.status_pc_token, null, theCafe.license_name, thePCInfo.pc_name)
			.catch(ICafeApiError.skip)
		if (toknInfo?.token) {
			vueGlobal.showOrderList = true;
			return toknInfo?.token
		}
		return null;
	}

	// 更新预约倒计时
	this.updateBookingCountdown = function() {
		// 清除已存在的倒计时定时器
		if (that.bookingCountdownTimerId !== null) {
			clearInterval(that.bookingCountdownTimerId);
			that.bookingCountdownTimerId = null;
		}

		const [monthDay, time] = thePCStatus.recent_booking.split(' ');
		const [year, month, day] = monthDay.split('-');
		const [hour, minute] = time.split(':');
		vueLogin.recentBookingAt = hour + ':' + minute;
		var bookingDate = new Date(year, parseInt(month)-1, parseInt(day), parseInt(hour), parseInt(minute), 0);

		// 设置新的倒计时定时器
		that.bookingCountdownTimerId = setInterval(function() {
			const now = new Date();
			if (bookingDate < now) {
				vueLogin.recentBookingLeft = '';
				if (that.bookingCountdownTimerId !== null) {
					clearInterval(that.bookingCountdownTimerId);
					that.bookingCountdownTimerId = null;
				}
				return;
			}
			vueLogin.recentBookingLeft = format_time(Math.floor((bookingDate - now) / 1000));
		}, 1000); // 每秒钟更新
	}

	this.wss_client_status = async function(packet) {
		let data = packet.data
		vueGlobal.isLoading = false;
		// 收到第一条 client_status，说明 WSS 已经连上、拿到了这台 PC 的真实状态，登录按钮可以放开了
		vueGlobal.wssConnected = true;
		// if disable billing, auto login
		if (theSettings.license_using_billing == 0 && !theClientStatusInitialized) {
			theClientStatusInitialized = true;
			theLogin.guest_login();
			return;
		}

		var last_login_status = is_logined();
		var member_loan = 0;
		if (last_login_status && thePCStatus.member_loan > 0)
			member_loan = thePCStatus.member_loan;

		countdown_stop();
		thePCStatus = data.client_status;
		theApiClient.setServerCode(thePCStatus.license_server_code);

		// PC 分组背景：initApp 首次显示登录页时 client_status 还没到、分组未知，
		// 分组首次确定或被改到别的分组时，未登录状态下重新应用一次登录页背景
		var pcGroupKey = String(thePCStatus.pc_group_id ?? 0);
		if (that.lastPcGroupKey !== pcGroupKey) {
			that.lastPcGroupKey = pcGroupKey;
			if (!last_login_status && !is_logined())
				theLogin.apply_login_background();
		}

		console.log("Current state is " + (is_logined() ? 'logined' : 'logout'));
		console.log("Previous state is " + (last_login_status ? 'logined' : 'logout'));

		// 会员刚登录(上一状态未登录 → 当前已登录)时触发每日转盘自动弹窗
		// maybeAutoPop 内部判断: 启用 + auto_pop=1 + 今日可抽; 每次新登录允许弹一次
		if (typeof theSpinWheel !== 'undefined' && !last_login_status && is_logined()) {
			theSpinWheel._autoPopped = false;
			theSpinWheel.updateEligible(); // 按会员组更新入口可见性
			theSpinWheel.refreshRemaining(); // 拉一次剩余次数, 供入口按钮的徽章显示
			theSpinWheel.maybeAutoPop();
		}

		var d = new Date();
		thePCStatus.login_time = parseInt((d.getTime() + d.getTimezoneOffset() * 60 * 1000) / 1000);  // UTC time
		if (thePCStatus.member_group_name == null) {
			if (thePCStatus.member_group_id == MEMBER_GROUP_DEFAULT) {
				thePCStatus.member_group_desc = thePCStatus.member_group_name = translate_string('Default');
			}

			if (thePCStatus.member_group_id == MEMBER_GROUP_GUEST) {
				thePCStatus.member_group_desc = thePCStatus.member_group_name = translate_string('Guest');
			}

			if (thePCStatus.member_group_id == MEMBER_GROUP_PREPAID) {
				thePCStatus.member_group_desc = thePCStatus.member_group_name = translate_string('Prepaid');
			}

			if (thePCStatus.member_group_id == MEMBER_GROUP_POSTPAID) {
				thePCStatus.member_group_desc = thePCStatus.member_group_name = translate_string('Postpaid');
			}

			if (thePCStatus.member_group_id == MEMBER_GROUP_FREE) {
				thePCStatus.member_group_desc = thePCStatus.member_group_name = translate_string('Free');
			}

			if (thePCStatus.member_group_id == MEMBER_GROUP_OFFER) {
				thePCStatus.member_group_desc = thePCStatus.member_group_name = translate_string('Offer');
			}
		}

		if (thePCStatus.status_connect_time_left && thePCStatus.status_connect_time_left.length > 0) {
			// if time left < 00:00:00
			if (thePCStatus.status_connect_time_left.charAt(0) == '-') {
				thePCStatus.status_connect_time_left = -1;
			}
			else {
				var items = thePCStatus.status_connect_time_left.split(':');
				if (items.length == 0)
					thePCStatus.status_connect_time_left = 0;
				// parseInt("08") and parseInt("09") in wke return 0, must use parseInt("08", 10)
				if (items.length == 1)
					thePCStatus.status_connect_time_left = parseInt(items[0], 10);
				if (items.length == 2)
					thePCStatus.status_connect_time_left = parseInt(items[0], 10) * 60 + parseInt(items[1], 10);
				if (items.length == 3)
					thePCStatus.status_connect_time_left = parseInt(items[0], 10) * 60 * 60 + parseInt(items[1], 10) * 60 + parseInt(items[2], 10);
			}
		}

		// 仍然登录、且倒计时仍是负数 → 这次到期还没真正解决，保留计时器继续倒数，不能清掉。
		// WSS 重连/其它状态推送都会触发这个函数，如果每次都无条件清掉重置，5 分钟兜底就永远等不到
		// 触发的那一刻（见 countdown() 里的对应说明，这是生产环境 status_connect_time_left 长时间
		// 卡在负数、迟迟没退回登录页的根因）。只有登出了、或者续上了新的正数时间，才算真正解决。
		var stillExpiredAndLoggedIn = is_logined() && thePCStatus.status_connect_time_left < 0;
		if (theAutoCheckoutTimeoutId && !stillExpiredAndLoggedIn) {
			clearTimeout(theAutoCheckoutTimeoutId);
			theAutoCheckoutTimeoutId = null;
		}

		// postpaid show time used
		if (thePCStatus.status_connect_time_duration && thePCStatus.status_connect_time_duration.length > 0) {
			// if time left < 00:00:00
			var items = thePCStatus.status_connect_time_duration.split(':');
			if (items.length == 0)
				thePCStatus.status_connect_time_duration = 0;
			// parseInt("08") and parseInt("09") in wke return 0, must use parseInt("08", 10)
			if (items.length == 1)
				thePCStatus.status_connect_time_duration = parseInt(items[0], 10);
			if (items.length == 2)
				thePCStatus.status_connect_time_duration = parseInt(items[0], 10) * 60 + parseInt(items[1], 10);
			if (items.length == 3)
				thePCStatus.status_connect_time_duration = parseInt(items[0], 10) * 60 * 60 + parseInt(items[1], 10) * 60 + parseInt(items[2], 10);
		}

		// 会话被柜台暂停：锁屏并显示 Paused。与 maintenance/station_lock 不同，暂停发生在
		// 已登录状态下，所以不能放在下面那个 !is_logined() 分支里。恢复由柜台操作，客户端只是展示。
		if (thePCStatus.is_paused == 1) {
			// 只在「刚进入暂停」这一次发锁机指令：client_status 是会反复推送的，
			// 每次都发 SETWINDOWSIZE / SETWINDOWTOPMOST 会让窗口不停重绘。
			if (vueGlobal.lockMode != 'paused') {
				theLockBeforePause = { mode: vueGlobal.lockMode, locked: vueGlobal.isLocked };
				vueGlobal.lockMode = 'paused';
				vueGlobal.isLocked = true;
				// 必须真的锁住机器。只置 isLocked 的话遮罩仅仅盖住 iCafeMenu 窗口内部，客人切回
				// 游戏照样能玩——而暂停期间是不计费的，等于白送时长。锁法与 login.js 的
				// show_login_page / system.js 的 lock_form_submit 完全一致：禁用任务键 + 窗口置顶全屏。
				ICAFEMENU_CORE.sendCommandToExe("LOCK 65535");
				ICAFEMENU_CORE.sendCommandToExe("SETWINDOWSIZE -1*-1");
				theLastWindowSize = "-1*-1";
				ICAFEMENU_CORE.sendCommandToExe("SETWINDOWTOPMOST 1");
				// 锁屏后沿用游戏页背景与页面样式，避免回退到默认背景（同 system.js 的锁屏）
				apply_game_background_visual();
				vueGlobal.bodyClass = 'bd-game-page';
			}
			// 放在「首次进入」判断之外：万一锁屏页 DOM 被重新注入（lockMode 仍是 'paused' 但文案节点没了），
			// 下一次 client_status 推送会补回来；函数内部按 id 判重，反复推送不会插出多份
			show_paused_lock_message();
		} else if (vueGlobal.lockMode == 'paused') {
			hide_paused_lock_message();
			var lock_before_pause = theLockBeforePause || { mode: null, locked: false };
			theLockBeforePause = null;
			vueGlobal.lockMode = lock_before_pause.mode;
			if (lock_before_pause.locked) {
				// 暂停之前本来就锁着（客人自己锁的屏）：维持锁定，等客人自己输密码解锁
				vueGlobal.isLocked = true;
			} else {
				vueGlobal.isLocked = false;
				unlock_pc();
			}
		}

		// Handle system-imposed lock states (maintenance / station lock)
		// Only apply when not logged in; never override a user-initiated lock
		if (!is_logined()) {
			if (thePCStatus.pc_enabled == PC_ENABLED_MAINTENANCE) {
				vueGlobal.lockMode = 'maintenance';
				vueGlobal.isLocked = true;
			} else if (thePCStatus.pc_enabled == PC_ENABLED_LOGIN_LOCKED) {
				var wasStationLocked = vueGlobal.lockMode == 'station_lock';
				vueGlobal.lockMode = 'station_lock';
				vueGlobal.isLocked = true;
				// 锁屏刚出现的这一刻，焦点可能还停在登录页的输入框里（员工锁一台客人正站在前面的空闲机）。
				// login.js 里的 focusin 守卫只在焦点发生变化时才生效，所以这里主动弹开一次。
				// 只在"由非锁定变为锁定"的跃迁时执行，避免锁定期间每次 client_status 推送都抢走焦点，
				// 那会让锁屏上的关机、重启按钮没法用键盘操作。
				if (!wasStationLocked && document.activeElement && typeof document.activeElement.blur === 'function')
					document.activeElement.blur();
			} else if (vueGlobal.lockMode == 'maintenance' || vueGlobal.lockMode == 'station_lock') {
				// pc_enabled returned to 1 (staff approved/restored) — clear system lock
				vueGlobal.lockMode = null;
				vueGlobal.isLocked = false;
			}
		}

		// in login page
		if (!is_logined()) {
			theGame.stop_game_timers();
			if(theSettings.allow_client_print ?? 0)
			{
				ICAFEMENU_CORE.sendCommandToExe("STOP_PRINT_WATCH");
			}

			// show booking info
			if (thePCStatus.recent_booking ?? 0) {
				// 同步到登录页顶部展示
				// 更新预约倒计时
				that.updateBookingCountdown();
			} else {
				// 没有预定时清空提示
				vueLogin.recentBookingAt = '';
				vueLogin.recentBookingLeft = '';

				// 没有预约时, 清除倒计时定时器
				if (that.bookingCountdownTimerId !== null) {
					clearInterval(that.bookingCountdownTimerId);
					that.bookingCountdownTimerId = null;
				}
			}

			if (last_login_status) // after checkout
			{
				ICAFEMENU_CORE.sendCommandToExe('RUN logout.bat');

				// game api
				// theGame.game_tracker();

				theLogin.show_login_page('login');
				theEvents.reset();
				theChat.reset();

				// Reset member photo to ensure Free Session shows default avatar
				memberInfo.member_photo = null;

				if (theIsHomeVersion)
					return;

				// switch to icafemenu
				ICAFEMENU_CORE.sendCommandToExe("RUNGAME_SWITCH_TO 0");

				if (member_loan > 0) {
					sweetAlert("", translate_string('Your unpaid bill is {0} {1}. Please pay it at the front desk.').replace('{0}', member_loan).replace('{1}', theSettings.currency), "info");
				}

				var client_idle_mins = (typeof (theSettings.client_idle_mins) != 'undefined' ? theSettings.client_idle_mins : 0);
				if (client_idle_mins > 0) {
					// action after idle time
					if (theIdleMonitorTimerId != null) {
						clearTimeout(theIdleMonitorTimerId);
						theIdleMonitorTimerId = null;
					}
					console.log('Will ' + theSettings.client_idle_action + ' after idle ' + client_idle_mins + ' minutes');
					theIdleMonitorTimerId = setTimeout(function () {

						if (['run_checkout', 'run'].includes(theSettings.client_idle_action.toLowerCase())) {
							console.log('RUN run.bat');
							ICAFEMENU_CORE.sendCommandToExe('RUN run.bat');
						}

						if (['shutdown_checkout', 'shutdown'].includes(theSettings.client_idle_action.toLowerCase())) {
							unlock_all();
							console.log('Shutdown');
							ICAFEMENU_CORE.sendCommandToExe("SHUTDOWN ONLY");
						}

						if (theSettings.client_idle_action.toLowerCase() == 'reboot') {
							unlock_all();
							console.log('Reboot');
							ICAFEMENU_CORE.sendCommandToExe("SHUTDOWN REBOOT");
						}

						if (theSettings.client_idle_action.toLowerCase() == 'logoff') {
							unlock_all();
							console.log('Logoff');
							ICAFEMENU_CORE.sendCommandToExe("SHUTDOWN LOGOFF");
						}

						if (theSettings.client_idle_action.toLowerCase() == 'close all apps') {
							// kill all apps
							console.log('Close all apps');
							ICAFEMENU_CORE.sendCommandToExe("RUNGAME_TERMINATE 0");
						}

					}, client_idle_mins * 1000 * 60);
				}

				return;
			}

			return;
		}
		// end login page

		// already logined
		// 登录后, 清除预约倒计时定时器
		if (that.bookingCountdownTimerId !== null) {
			clearInterval(that.bookingCountdownTimerId);
			that.bookingCountdownTimerId = null;
		}
		theConvertToMember.init();

		// 切换服务器了
		if (typeof (thePCStatus.license_server_code) != 'undefined' && vueGlobal.license_server_code != thePCStatus.license_server_code) {
			if (vueGlobal.license_server_code != '') {
				// 将token置为空,好让即使本次失败, 后续还是有机会继续获取token
				var clientMemberInfo = JSON.parse(localStorage.getItem('clientMemberInfo'));
				clientMemberInfo.token = '';
				localStorage.setItem('clientMemberInfo', JSON.stringify(clientMemberInfo));

				await that.requestApiToken().catch(ICafeApiError.skip);
			}
			vueGlobal.license_server_code = thePCStatus.license_server_code;
		}

		// login in & previous state is checkout & not locked
		if (!last_login_status) // from login to logined
		{
			// 避免弹出多个窗口 memberLogin => refreshBonus => wss, clientStartSession => wss
			if (thePCStatus.recent_booking??0) {
				toastr.info(translate_string("Recent booking") + "<br>" + thePCStatus.recent_booking, '', { timeOut: 2000, extendedTimeOut: 1000 });
			}
			// 如果是能获取到当前status_pc_token的用户, 则通过status_pc_token来进行登录
			if (!theIsHomeVersion) {
				if (theSettings.license_show_client_mode == 'full screen') {
					ICAFEMENU_CORE.sendCommandToExe("SETWINDOWSIZE -3*-3"); // no topmost
					theLastWindowSize = "-3*-3";
					ICAFEMENU_CORE.sendCommandToExe("SETWINDOWTOPMOST 0");
				}

				if (typeof (theSettings.license_show_client_mode) == 'undefined' || theSettings.license_show_client_mode == 'maximized') {
					ICAFEMENU_CORE.sendCommandToExe("SETWINDOWSIZE -2*-2");
					theLastWindowSize = "-2*-2";
				}

				if (theSettings.license_show_client_mode == 'minimized') {
					ICAFEMENU_CORE.sendCommandToExe("SETWINDOWSIZE -2*-2");
					theLastWindowSize = "-2*-2";
					ICAFEMENU_CORE.sendCommandToExe("HIDEWINDOW");
				}

				/*
					TASKMGR  = 0x01,	// disable task manager (Ctrl+Alt+Del)
					TASKKEYS = 0x02,	// disable task keys (Alt-TAB, etc)
					TASKBAR  = 0x04,	// disable task bar
					LOGOFF   = 0x08,	// disable task bar
					WINKEYS	 = 0x10,	// disable windows keys
				*/

				ICAFEMENU_CORE.sendCommandToExe("UNLOCK 3"); // unlock alt+tab after login, user want to switch in game
				if (theSettings.license_show_client_mode != 'full screen')
					ICAFEMENU_CORE.sendCommandToExe("UNLOCK 4"); // only enable taskbar
				if (theSettings.client_winkeys_enable != 0)
					ICAFEMENU_CORE.sendCommandToExe("UNLOCK 16"); // unlock windows keys after login
			}

			ICAFEMENU_CORE.sendCommandToExe('RUN cmd /c "set ICAFEMENU_MEMBER=' + (thePCStatus.member_account ?? '') + '&& login.bat"');

			let token = await that.requestApiToken().catch(ICafeApiError.skip);
			if(token && thePCStatus.member_account)
			{
				let message = await theApiClient.callCafeApi('memberMessage', 'get', { member_account: thePCStatus.member_account }).catch(ICafeApiError.skip);
				if(message)
				{
					toastr.options.tapToDismiss = true;
					toastr.options.timeOut = 0;
					toastr.options.extendedTimeOut = 0;
					for (var i = 0; i < message.log_list.length; i++) {
						toastr.info(htmlToText(message.log_list[i].log_details), translate_string('Message from ') + message.log_list[i].log_staff_name, {
							toastClass: "custom-transparent-toast"
						});
					}
				}
			}

			if (theSettings.license_start_game_tracker ?? 0)
			{
				let rankData = await theApiClient.callCafeApi('gameRankData', 'get', { pc_name: thePCInfo.pc_name }).catch(ICafeApiError.skip);
				if(rankData)
					vueHome.leaderboardItems = rankData.rank
			}

			theHome.show(true);

			// [NEW] Initialize offers data for sidebar
			if (typeof theShop !== 'undefined' && typeof theShop.initOfferGoods === 'function') {
				theShop.initOfferGoods();
			}

			if (theSettings.show_game_page_as_default)
				theGame.show(true);

			theLogin.stop_login_timers();

			if (theIsHomeVersion) {
				theEvents.show();
			}
			else {
				if (theSettings.license_save_enable) {
					if (is_member_logined())
						ICAFEMENU_CORE.sendCommandToExe("INIT_GAME_SAVING " + thePCStatus.member_account);
					else
						ICAFEMENU_CORE.sendCommandToExe("INIT_GAME_SAVING guest_" + thePCInfo.pc_name);
				}

				if ((theSettings.allow_client_print ?? 0) != 0) {
					ICAFEMENU_CORE.sendCommandToExe("START_PRINT_WATCH")
				}
			}

			// start monitoring game track for fornite/lol
			if (theGameTrackerInterval != null) {
				clearInterval(theGameTrackerInterval);
				theGameTrackerInterval = null;
			}
			// stop game api tracker currently
			// theGameTrackerInterval = setInterval(() => theGame.game_tracker(), 1000 * 60 * 5);
		}
		// end from login to logined

		// already logined but wss reconnect, or topup update left time

		// now state is login in (from logined to logined)

		// don't show checkout button if not member login
		vueGlobal.menuButton.logout = false;
		if (thePCStatus.member_group_id != MEMBER_GROUP_POSTPAID && thePCStatus.member_group_id != MEMBER_GROUP_PREPAID && thePCStatus.member_group_id != MEMBER_GROUP_OFFER)
			vueGlobal.menuButton.logout = true;
		if (theSettings.allow_prepaid_checkout == 1 && thePCStatus.member_group_id != MEMBER_GROUP_POSTPAID)
			vueGlobal.menuButton.logout = true;

		// show member info
		memberInfo.member_info_name = (thePCStatus.member_account || '').toUpperCase() + " / " + (thePCStatus.member_group_name || '').toUpperCase();
		memberInfo.member_name = (thePCStatus.member_account || '').toUpperCase();
		memberInfo.member_group_name = (thePCStatus.member_group_name || '').toUpperCase();
		memberInfo.canChangePassword = (() => {
			// 1. client settings 没有开启社交登录的(social_login)
			// 2. member setttings 开启了(allow_password_login_always)
			// 3. 会员没有绑定社交帐号的
			if (theSettings.social_login != 1) {
				return true;
			}
			//TODO get allow_password_login_always
			if (theSettings.allow_password_login_always == 1) {
				return true;
			}
			//TODO get member_oauth_platform
			if ((thePCStatus.member_oauth_platform ?? 'account') == 'account') {
				return true;
			}
			return false;
		})()
		PetiteVue.nextTick(() => {
			ui_init();
			$('[data-toggle="tooltip"]').tooltip();
		});

		// $('.cafe_info_member_logo').attr('src', ICAFEMENU_CORE.icons_path('mg-' + (thePCStatus.member_group_id > MEMBER_GROUP_DEFAULT ? thePCStatus.member_group_id.toString() : '0') + '.png') );

		if (theSettings.license_using_billing == 1) {
			theAvailableOffers = []; // total和balance当成了一个特殊的offer，所以theAvailableOffers[] = [total, offer1, offer2, ... offterN, balance]
			var id = 1;
			for (var i = 0; i < thePCStatus.available_offers.length; i++) {
				var in_using = (thePCStatus.available_offers[i].product_name == thePCStatus.offer_in_using && i == 0);
				// in_using offer 用 status_connect_time_left 倒计时（session 可能被高优先级 offer 截断）
				var offer_left_secs = in_using ? thePCStatus.status_connect_time_left : thePCStatus.available_offers[i].member_offer_left_seconds;
				theAvailableOffers.push({
					id: id++,
					in_using: in_using,
					time_type: 'offer',
					name: (thePCStatus.available_offers[i].product_name || '').toUpperCase(),
					total_secs: thePCStatus.available_offers[i].product_seconds,
					left_secs: offer_left_secs,
					last_notify_mins: 1000,
					active: '',
					member_offer_id: thePCStatus.available_offers[i].member_offer_id,
					product_is_promoted: thePCStatus.available_offers[i].product_is_promoted || 0
				});
			}

			// 限时的free/postpaid(Start Free/postpaid Session对话框现场指定了具体时长)：member_balance_bonus_left_seconds
			// 是按会员组折扣价算出来的，FREE是100%折扣，价格是0，算出来恒为0，不能反映真实到期时间——这里额外
			// 认一个session_has_duration_limit标记（服务端根据member_extra.session_expire算出来的），保证限时
			// free/postpaid也能跟普通余额会话一样露出一行倒计时，而不是完全不显示计时器
			var is_timed_free_or_postpaid = (thePCStatus.member_group_id == MEMBER_GROUP_POSTPAID || thePCStatus.member_group_id == MEMBER_GROUP_FREE) && thePCStatus.session_has_duration_limit;

			if (thePCStatus.member_balance_bonus_left_seconds > 0 || is_timed_free_or_postpaid) {
				var in_using = (thePCStatus.offer_in_using == null || thePCStatus.offer_in_using.length == 0);
				var name = translate_string('BALANCE');
				var left_secs = in_using ? thePCStatus.status_connect_time_left : thePCStatus.member_balance_bonus_left_seconds;
				var balance_total_secs = thePCStatus.member_balance_bonus_left_seconds;
				if (thePCStatus.member_group_id == MEMBER_GROUP_POSTPAID || thePCStatus.member_group_id == MEMBER_GROUP_FREE) {
					left_secs = thePCStatus.status_connect_time_left;
					if (is_timed_free_or_postpaid) balance_total_secs = thePCStatus.status_connect_time_left;
				}

				theAvailableOffers.push({
					id: id++,
					in_using: in_using,
					time_type: 'balance',
					name: name,
					total_secs: balance_total_secs,
					left_secs: left_secs,
					last_notify_mins: 1000,
					active: ''
				});
			}

			// add total：从原始数据求和保证总时间正确（in_using offer 改用了 session 截断时间，不能直接 sum left_secs）
			if (theAvailableOffers.length > 0) {
				var total_secs = 0;
				var left_secs = 0;
				for (var i = 0; i < thePCStatus.available_offers.length; i++) {
					total_secs += thePCStatus.available_offers[i].product_seconds;
					left_secs += thePCStatus.available_offers[i].member_offer_left_seconds;
				}
				if (thePCStatus.member_balance_bonus_left_seconds > 0 || is_timed_free_or_postpaid) {
					total_secs += is_timed_free_or_postpaid ? thePCStatus.status_connect_time_left : thePCStatus.member_balance_bonus_left_seconds;
					left_secs += (thePCStatus.offer_in_using == null || thePCStatus.offer_in_using.length == 0)
						? thePCStatus.status_connect_time_left
						: thePCStatus.member_balance_bonus_left_seconds;
				}

				theAvailableOffers.splice(0, 0, {
					id: id++,
					in_using: false,
					time_type: 'total',
					// 用 getter 而不是在这里算好存字符串：这一行可能在语言包加载完之前就生成了，
					// 存死的话会一直显示英文 TOTAL。getter 每次读都现翻——每秒的倒计时会
					// JSON 拷贝一遍（helper.js 的 vueAvailableOffers.items = JSON.parse(...)），
					// 语言包到了、切了语言，下一秒就跟着变
					get name() { return translate_string('TOTAL'); },
					total_secs: total_secs,
					left_secs: left_secs,
					last_notify_mins: 1000,
					active: ''
				});
			}

			if (theAvailableOffers.length > 0 && theAvailableOffers[1].name.toString().toUpperCase() == thePCStatus.offer_in_using.toString().toUpperCase()) {
				theAvailableOffers[1].in_using = true;
				theAvailableOffers[1].active = 'active';
			}

			// 必须拷贝一份，不能直接 vueAvailableOffers.items = theAvailableOffers：共享同一批对象时，
			// 省电模式下的 sync_offers_timer 比较 items[i].left_secs 与 theAvailableOffers[i].left_secs
			// 永远相等、一行都不更新，剩余时间/postpaid 已用时长就停在这次推送的值上（顶栏时钟照走）。
			// percent 下限钳 0 由 offer_display_percent 负责（status_connect_time_left 可能被压成 -1）
			sync_offers_display();
			PetiteVue.nextTick(() => {
				ui_init();
				$('[data-toggle="tooltip"]').tooltip();
			});

			$('#carousel_main').carousel({ interval: false });
		}

		countdown_start();
		if (!theIsHomeVersion) {
			if (theQueryRunGameIdsIntervalId != null) {
				clearInterval(theQueryRunGameIdsIntervalId);
				theQueryRunGameIdsIntervalId = null;
			}
			theGame.query_rungame_ids();
			theQueryRunGameIdsIntervalId = setInterval(() => theGame.query_rungame_ids(), 3000);
		}

		// show left money and bonus - use computed vueGlobal properties
		vueGlobal.memberGroupId = thePCStatus.member_group_id;

		if (theSettings.license_using_billing == 1 && thePCStatus.member_group_id != MEMBER_GROUP_POSTPAID && thePCStatus.member_group_id != MEMBER_GROUP_FREE) {
			memberInfo.member_balance_realtime = formatBigNumber(thePCStatus.member_balance_realtime);
			memberInfo.member_balance_bonus_realtime = formatBigNumber(thePCStatus.member_balance_bonus_realtime);

			memberInfo.member_coin_balance = formatBigNumber(thePCStatus.member_coin_balance);
			memberInfo.member_loan_raw = thePCStatus.member_loan;
			memberInfo.member_loan = formatBigNumber(thePCStatus.member_loan);

			PetiteVue.nextTick(() => {
				ui_init();
				$('[data-toggle="tooltip"]').tooltip();
			});
		}
		// end now state is login in
		return;
	}

	// 注册全部原生命令处理器。原来是包在 IIFE (() => {...})() 里，脚本一加载就立即执行，跟裸顶层
	// 语句效果一样；改成命名函数、由 initApp() 显式调用，理由同上面的 registerWssHandlers()。
	this.registerExeCommandHandlers = function() {
		ICAFEMENU_CORE.onExeCommand("CallExeDone", strParam => {
			var cols = strParam.split(' ');
			if (typeof (cols) == 'undefined')
				return;
			if (cols.length == 0)
				return;
			var action = cols[0];

			if (action == 'INIT_GAME_SAVING') {
				setTimeout(function () {
					$('input[name=search]').css({ background: '#ffffff' });

					setTimeout(function () {
						$('input[name=search]').css({ background: 'transparent' });
					}, 500);

				}, 500);
			}
		}).onExeCommand("SHOWMSG", strParam => {
			sweetAlert("", translate_string(strParam), "info");
		}).onExeCommand('TOAST', strParam => {
			toast(translate_string(strParam));
		}).onExeCommand('WSS_TIMEOUT', strParam => {
			// direct to login page, allow player work when cloud server down
			// process_wss_package({ action: 'client_status', version: 2, type: 'request', from: 'wss-server', target: 'client', status: 'success', data: {client_status: { member_account: '' }}});
		}).onExeCommand('WSS_LOGIN', strParam => {
			theWssLogined = true;
		}).onExeCommand('WSS_LOGIN_FAILED', strParam => {
			//if (!theIsHomeVersion)
			//	return;
			vueGlobal.isLoading = false;
			// 会话中被服务端拒绝/踢下线（重名 PC 的 kick_out、t/sid 被拒等）：先把本地登录状态清掉再回登录页。
			// 裸调 show_login_page() 不清 thePCStatus，末尾的 unlock_pc() 会按"仍在登录"把锁撤掉；而原生 WSS
			// 线程此时已经退出，不会再有 client_status 来纠正。未登录的情况 logout_session() 内部自己处理。
			theSession.logout_session();
			sweetAlert("", strParam.length ? translate_string(strParam) : translate_string('Login failed'), 'error');
		}).onExeCommand('WSS_DISCONNECTED', strParam => {
			theWssLogined = false;
			if (theIsHomeVersion)
				return;
		}).onExeCommand('WM_DISPLAYCHANGE', strParam => {
			if (theLastWindowSize.length > 0)
				ICAFEMENU_CORE.sendCommandToExe("SETWINDOWSIZE " + theLastWindowSize);
		}).onExeCommand('COVERSHOW', strParam => {
			vueGlobal.isLoading = true;
		}).onExeCommand('COVERHIDE', strParam => {
			vueGlobal.isLoading = false;
		}).onExeCommand("RUNGAME_IDS", strParam => {
			var ids = strParam.split(',');
			var runGames = [];
			for (var i = 0; i < ids.length; i++) {
				theGames.forEach(function (obj) {
					if (obj.pkg_id == ids[i]) {
						// 分支 B：图标文件在本地磁盘，浏览器无法直接访问；改用 clientapi.php 接口获取，
						// 使用 bootstrap 时服务端签发的 t/sid 鉴权（与 icafe_js 加载时的鉴权方式相同）
						var icon_url = window.theBootstrap
							? `/api/clientapi.php?type=icon&id=${obj.pkg_id}&icafe_id=${window.theBootstrap.icafe_id}&pc_name=${encodeURIComponent(window.theBootstrap.pc_name)}&t=${window.theBootstrap.t}&sid=${encodeURIComponent(window.theBootstrap.sid)}`
							: ICAFEMENU_CORE.icons_path(obj.pkg_id + '.png');
						runGames.push({
							pkg_id: obj.pkg_id,
							pkg_name: obj.pkg_name,
							icon_url: icon_url
						});
					}
				});
			}
			vueGlobal.runningGames = runGames;
			// 省电模式的心跳：这条命令每 3 秒来一次（theQueryRunGameIdsIntervalId），
			// 正好用来判断"有没有游戏在跑"以及"菜单是不是已经很久没人碰了"
			power_save_tick(runGames.length > 0);
			PetiteVue.nextTick(() => {
				$('[data-toggle="tooltip"]').tooltip();
			});
		}).onExeCommand("APIResponse", strParam => {
			var pos = strParam.indexOf(' ');
			var api_action = strParam.substr(0, pos);
			strParam = strParam.substr(pos + 1);
			if (strParam.length == 0)
				return;
			var data = JSON.parse(strParam);

			if (api_action.indexOf('type=event-') >= 0) {
				theEvents.onAPIResponse(api_action, data);
				return;
			}

			if (api_action.indexOf('type=game-rank-data') >= 0) {
				if (data.result == 0) {
					sweetAlert("", translate_string(data.message), 'error');
					return;
				}
				vueHome.leaderboardItems = JSON.parse(JSON.stringify(data.rank));
				return;
			}
		}).onExeCommand("GameStats", strParam => {
			// 这里的参数与clientapi.php里面的fortnite-match-stats返回的data是一致的
			// strParam 示例: '{"type":"fortnite-match-stats", "win_coins":100}';
			var data = JSON.parse(strParam);
			var game_stats_type = data.type ?? '';
			var win_coins = data.win_coins ?? 0;
			var gameName = getGameName(game_stats_type);
			var message = "You earned " + win_coins + " coins in the " + gameName + "!"
			// win_coins 是否大于0
			if (win_coins > 0) {
				sweetAlert("", translate_string(message), "success");
			}
		}).onExeCommand("VOLUME", strParam => {
			const value = strParam.split(' ')
			if (value.length !== 2)
				return
			const volume = parseInt(value[0])
			const isMuted = value[1] === '1'
			theAudioSettings.setVolumeMute(volume, isMuted)
		}).onExeCommand("MOUSE_DOUBLE_CLICK_SPEED", strParam => {
			const value = parseInt(strParam)
			theMouseSettings.setDoubleClickSpeed(value)
		}).onExeCommand("MOUSE_MOVE_SPEED", strParam => {
			const value = parseInt(strParam)
			theMouseSettings.setMoveSpeed(value)
		}).onExeCommand("MOUSE_SMOOTHNESS", strParam => {
			const value = parseInt(strParam)
			theMouseSettings.setMouseSmoothness(value === 1)
		}).onExeCommand("SYSTEM_LANGUAGE", strParam => {
			vueGlobal.currentSystemLanguage = strParam;
		}).onExeCommand("PRINT_CONFIRM", strParam => {
			const pageCount = parseInt(strParam)
			ICAFEMENU_CORE.sendCommandToExe("SHOWWINDOW")
			theShopPrint.setup()

			if (vuePrint.blackwhite == null || vuePrint.color == null) {
				sweetAlert("", translate_string("iCafeCloud Printer not installed, please contact administrator!"), "error")
				return
			}

			vuePrint.product_id = vuePrint.blackwhite.product_id
			vuePrint.page_count = pageCount
			theShopPrint.cart_refresh()
			vueGlobal.modals.print = true;
		// 分支 B 下 NOVNC_START/NOVNC_STOP（见 core.js wsssend 转发的 novnc_start/novnc_stop 监听）跑完后，
		// 原生没有自己连着的 wss 连接能直接回 response，回调这里让 JS 用它自己那条 wss 连接把 response 发出去，
		// 跟分支 A 原生 ServiceWss.cpp 直接 theWssClient.SendJson(response) 的效果对齐
		}).onExeCommand('NOVNC_START_RESULT', strParam => {
			ICAFEMENU_CORE.wsssend('novnc_start', 'response', 'web', { pc_name: strParam });
		}).onExeCommand('NOVNC_STOP_RESULT', strParam => {
			ICAFEMENU_CORE.wsssend('novnc_stop', 'response', 'web', { pc_name: strParam });
		// 原生 VNC 数据桥接线程（ServiceWss.cpp 的 VncBridgeThreadProc）读到本机 tvnserver.exe 的画面字节后
		// 回调这里，跟 NOVNC_START_RESULT/NOVNC_STOP_RESULT 一样：原生没有自己的 wss 连接可发，靠 JS 转发
		}).onExeCommand('NOVNC_DATA_OUT', strParam => {
			ICAFEMENU_CORE.wsssend('send_to_vnc', 'request', 'wss-server', { vnc_data: strParam });
		// 原生 tasklist /FO csv 采集结果 base64 编码后回调这里（CSV 本身带双引号，走 JS 字符串字面量
		// 会破坏语法，所以编码了），解码后按分支 A 原生 CServiceWss::onMessage 的响应格式转发出去
		}).onExeCommand('TASK_LIST_RESULT', strParam => {
			let csv = '';
			try { csv = atob(strParam || ''); } catch (e) {}
			ICAFEMENU_CORE.wsssend('task_list', 'response', 'web', { pc_name: thePCInfo.pc_name, task_list_csv: csv });
		// task_kill 的 status/message 是 CP 端 main.htm 读的包级顶层字段（不在 data 里），wsssend() 的
		// 通用签名没有这两个位置，这里直接拼包发送，跟分支 A 原生 ServiceWss.cpp 的响应格式对齐
		}).onExeCommand('TASK_KILL_RESULT', strParam => {
			if (window.theWssClient && window.theWssClient.isLogined()) {
				window.theWssClient.send(JSON.stringify({
					action: 'task_kill', type: 'response', target: 'web', from: 'client', version: 2,
					status: strParam === 'error' ? 'error' : 'success',
					message: strParam === 'error' ? 'Teminate task failed' : '',
					data: { pc_name: thePCInfo.pc_name }
				}));
			}
		});

		// 分支 B 关机时由 C++ 通过 wkeExeCallJs("onShutdown()") 调用，发 request_checkout。
		// 分支 A 由 C++ 原生 theWssClient.SendText 直接发，不走这里。
		window.onShutdown = function() {
			ICAFEMENU_CORE.wsssend('request_checkout', 'request', 'wss-server', { source: 'shutdown' });
		};
	}
}
