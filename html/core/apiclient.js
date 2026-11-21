/**
 * by Link
 * 2025 08
 * icafememu api
 */

// 跟 core/js/helper.js 的 throttle 实现一样，但这里单独写一份、不依赖它：refreshApiToken
// 这个类字段是在下面 ApiClient 构造时立即求值的，而 apiclient.js 是开机阶段早早就被加载执行的
// （bootstrap.js 里紧跟在 icafe.js 后面），比 helper.js（要等主题加载完才会被拉取）早得多——
// 直接依赖 helper.js 的 throttle 会在这里就 ReferenceError。换一个 8 行的小工具函数本地写一份
// 更直接，apiclient.js 对 core.js（core/js 之外那个更早加载的平台层）的依赖收窄到只剩 onWss。
//
// 命名故意不叫 throttle：两边都是不带 let/const 的裸 function 声明，挂在全局 window 上，
// 同名的话 helper.js 加载完会把这份覆盖掉（虽然当前实现逐字节相同、又是闭包捕获值不受影响，
// 不会导致运行时错误，但以后谁改了 helper.js 那份容易忘记这里还有独立一份要同步，也容易让
// 调试的人看懵"这个 throttle 到底是哪一份"），干脆用不会撞名的名字彻底避开这个问题。
function apiClientThrottle(fn, wait = 300) {
	let lastTime = 0;
	return function (...args) {
		const now = Date.now();
		if (now - lastTime >= wait) {
			lastTime = now;
			return fn.apply(this, args);
		}
	};
}

class ICafeApiError extends Error {
	constructor(message, code) {
		super(message)
		this.code = code
	}
	static skip = (e) => {
		var errorMessage = (e?.message ?? 'unknown');
		console.log('### ', e.stack);
	}
	static show = (e) => {
		var errorMessage = (e?.message ?? 'unknown');
		console.log('### ', e.stack);
		sweetAlert("", translate_string(errorMessage), 'error');
	}
}

/**
 * 1. 实现httpAPI的封装
 * 2. 管理pc和member的状态信息
 */
class ApiClient {

	constructor() {
		this.server_code = 'cp';
		this.icafeId = '0';
		this.memberInfo = {};
		this.pcStatus = {};
		this.pcInfo = {
			"pc_name" : "",
			"pc_turn_off_monitor_seconds" : 0,
			"version_date": ""};
		this.init();
	}
	init() {
		ICAFEMENU_CORE.onWss('client_status', ({ data }) => {
			this.pcStatus = data?.client_status ?? {};
		})
		// pc_name/pc_turn_off_monitor_seconds/version_date 由 main.htm 在两个分支下都直接从 URL query
		// 读出来赋进 this.pcInfo（见 main.htm bootstrap()），不再依赖原生事后调用 OnCommand("PCInfo", ...)
		// 推送——那次推送只推一次不重试，时机跟原生自身初始化节奏赛跑，可能早于/晚于页面脚本加载完成，
		// 分支 A 曾经因此偶发 pc_name 显示为空
	}
	setServerCode(code) {
		this.server_code = code;
	}
	setIcaFeId(id) {
		this.icafeId = id;
	}
	/**
	 * server api url
	 * start with api/v2
	 * @param {*} uri 
	 * @returns 
	 */
	getServerUrl(uri) {
		if (uri.startsWith('/')) {
			uri = uri.substring(1);
		}
		return `https://${this.server_code}.icafecloud.com/api/v2/${uri}`;
	}
	/**
	 * cafe api url
	 * start with cafe id
	 * @param {*} uri 
	 * @returns 
	 */
	getCafeUrl(uri) {
		if (uri.startsWith('/')) {
			uri = uri.substring(1);
		}
		return `https://${this.server_code}.icafecloud.com/api/v2/cafe/${this.icafeId}/${uri}`;
	}
	/**
	 * is login
	 * @returns 
	 */
	isLogined() {
		return !!this.pcStatus?.member_account?.length 
	}
	/**
	 * is member login
	 * @returns 
	 */
	isMemberLogin() {
		return this.isLogined() && this.pcStatus.member_group_id > MEMBER_GROUP_GUEST
	}
	/**
	 * call api /api/v2/{endpoint}
	 * 正确返回逻辑
	 * 1. http statut == 0 
	 * 2. json数据的 code==200
	 * 3. 支付接口 result != undefined
	 * 自动refreshtoken
	 * 1. error.code != 401
	 * 2. 不是clientStartSession
	 * 3. 不是guestLogin
	 * @param {*} endpoint 
	 * @param {*} method 
	 * @param {*} data get请求会拼query参数，其余会转成json body
	 * @returns 
	 */
	async callApi(endpoint, method = 'GET', data = null, opt = {}) {
		console.log('callApi ' + method + ' ' + endpoint);
		let url = /^http/i.test(endpoint) ? endpoint : this.getServerUrl(endpoint);
		const options = {
			method: method,
			headers: {
				'Content-Type': 'application/json'
			}
		};
		if (this.getMemberInfo()?.token) {
			options.headers['Authorization'] = `Bearer ${this.getMemberInfo()?.token}`;
		}
		if (data) {
			for (const key in data) {
				if (!(data[key] || data[key] === 0 || data[key] === false || data[key] === '')) {
					delete data[key]
				}
			}
			if (/get/i.test(method)) {
				url = new URL(url);
				for (const key in data) {
					url.searchParams.append(key, data[key]);
				}
				url.searchParams.append('_t', Date.now());
			} else {
				options.data = JSON.stringify(data)
			}
		}

		if (opt.headers) {
			options.headers = { ...options.headers, ...opt.headers }
			delete opt.headers
		}
		
		var json = null;

		try
		{
			json = await $.ajax({ url, method, dataType: 'json', ...options,...opt});
		}
		catch(error)
		{
			if (!/memberLogin/.test(url))
				this.refreshApiToken();
			// readyState=0 且 status=0 表示网络无法连接（非 HTTP 错误），避免将原始 XHR 对象展示给用户
			let errorMessage = (error?.readyState === 0 && error?.status === 0)
				? translate_string('Connection error')
				: JSON.stringify(error);
			let message = `callApi_error url: ${url} message: ${errorMessage}`
			console.log(message)
			throw new ICafeApiError(errorMessage, 1);
		}
		
		if (!json)
			return null;
		
		if (typeof json.result !== 'undefined') {
			return json;
		}
		if (json.code !== 200) {
			let errorMessage = json.message ?? 'unknown';
			let message = `callApi_error url: ${url} code: ${json.code}, message: ${errorMessage}`
			console.log(message)
			throw new ICafeApiError(errorMessage, json.code)
		}
		console.log(JSON.stringify(json));
		return json.data;
	}

	/**
	 * call cafe api /api/v2/cafe/<cafeid>/{endpoint}
		* @param {*} endpoint 
	 * @param {*} method 
	 * @param {*} data 
	 * @returns 
	 */
	async callCafeApi(endpoint, method = 'GET', data = null, opt = {}) {
		return this.callApi(this.getCafeUrl(endpoint), method, data, opt)
	}
	/**
	 * refresh api token
	 * @param {*} member_account 
	 * @param {*} status_pc_token 
	 * @param {*} member_password 
	 * @param {*} license_name 
	 * @param {*} pc_name 
	 * @returns 
	 */
	async memberLogin(member_account, status_pc_token, member_password, license_name, pc_name, booking_password = null) {
		let url = this.getServerUrl('auth/memberLogin');
		let data = { member_account, status_pc_token, member_password, license_name, pc_name, is_client: 1, };
		if (booking_password) {
			data.booking_password = booking_password;
		}
		let toknInfo = await this.callApi(url, 'POST', data);
		if(toknInfo){
			localStorage.setItem('clientMemberInfo', JSON.stringify(toknInfo));
			return toknInfo;
		}
		return null;
	}
	/**
	 * Scan member login
	 * 
	 * @param {*} scan_code
	 * @param {*} license_name
	 * @param {*} pc_name
	 */
	async scanMemberLogin(scan_code, license_name, pc_name) {
		let url = this.getServerUrl('auth/memberLogin');
		let data = { scan_code, license_name, pc_name, is_client: 1 };
		let toknInfo = await this.callApi(url, 'POST', data);
		// 仅在拿到 token 时才视为成功；PC 被他人预约等情况会返回无 token 的响应（如需预约密码），此时不落地
		if(toknInfo && toknInfo.token){
			localStorage.setItem('clientMemberInfo', JSON.stringify(toknInfo));
			return toknInfo;
		}
		return null;
	}
	getMemberInfo() {
		let memberInfo = localStorage.getItem('clientMemberInfo');
		if (memberInfo && /^\{/.test(memberInfo)) {
			return JSON.parse(memberInfo);
		}
		return {};
	}
	clearMemberInfo() {
		localStorage.removeItem('clientMemberInfo');
	}
	async getToken() {
		return this.getMemberInfo()?.token
	}

	/**
	 * guest login 
	 * @param {*} data 
	 * @param {*} opt 
	 * @returns 
	 */
	async guestLogin(data,opt={}) {
		let url = this.getServerUrl('auth/guestLogin');
		let toknInfo = await this.callApi(url, 'POST', data, { ...opt })
		if(toknInfo){
			localStorage.setItem('clientMemberInfo', JSON.stringify(toknInfo));
			return toknInfo;
		}
	}
	/**
	 * 一般用在token失效后（api接口error），重新获取token
	 * 30秒内只会执行一次
	 */
	refreshApiToken = apiClientThrottle(async () => {
		return this.memberLogin(this.pcStatus.member_account, this.pcStatus.status_pc_token, null, theCafe.license_name, this.pcInfo.pc_name).catch(ICafeApiError.skip);
	}, 30_000)
}

const theApiClient = new ApiClient();
theApiClient.setServerCode(theSettings.license_info.license_server_code)
theApiClient.setIcaFeId(theCafe.id)