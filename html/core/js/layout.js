// 会员自己的数据/操作：订单列表、余额历史、反馈、改密码。
// checklist（会员核对清单弹窗）也归在这里——展示的是会员+PC+订单的汇总信息。
function Member()
{
	this.checklist = function() {
		theApiClient.callCafeApi('memberChecklist', 'GET').then(res => {
			vueChecklistInfo.orders = res?.orders || [];
			vueChecklistInfo.member = res?.member || {};
			vueChecklistInfo.pc = res?.pc || {};


			vueGlobal.modals.checklist = true;
		}).catch(ICafeApiError.skip)
	}

	// checklist 弹窗里点 Checkout 统一入口：模板只调这一个方法，不直接改 vueGlobal.modals.checklist
	this.checkoutFromChecklist = function() {
		vueGlobal.modals.checklist = false;
		checkout_click();
	}

	this.refresh_order_list = async function()
	{
		var payload = {
			sort_name: order_filter_params.sort_name,
			sort: order_filter_params.sort,
			search_text: order_filter_params?.search_text??"",
			page: order_filter_params.paging_info.page,
			t: Math.random()
		}

		const data = await theApiClient.callCafeApi('memberOrders', 'get', payload).catch(ICafeApiError.skip)
		if (!data) return;
		order_filter_params.paging_info = data.paging_info;
		vueOrderList.items = JSON.parse(JSON.stringify(data.orders))
		vueOrderList.items = vueOrderList.items?.map(item=>{
			let method = item.order_payment_method
			let status = item.order_status
			let isQRPayment = method == PAY_METHOD_QR_FOR_PC_TIME || method == PAY_METHOD_QR || method == PAY_METHOD_QR_FOR_OFFER;
			let isPendding = status == ORDER_STATUS_PENDING || status == ORDER_STATUS_IN_PROCESS
			let canQRPay = isQRPayment && isPendding
			return {...item,canQRPay}
		})
		vueOrderList.paging_info = JSON.parse(JSON.stringify(data.paging_info))
	}

	this.order_page_first = function() {
		order_filter_params.paging_info.page = 1;
		this.refresh_order_list();
	}

	this.order_page_previous = function() {
		if (order_filter_params.paging_info.page > 1)
			order_filter_params.paging_info.page --;
		this.refresh_order_list();
	}

	this.order_page_next = function() {
		if (order_filter_params.paging_info.page < order_filter_params.paging_info.pages)
			order_filter_params.paging_info.page ++;
		this.refresh_order_list();
	}

	this.order_page_last = function(){
		order_filter_params.paging_info.page = order_filter_params.paging_info.pages;
		this.refresh_order_list();
	}

	this.order_page_go = function(index) {
		order_filter_params.paging_info.page = index;
		this.refresh_order_list();
	}

	this.order_search_post = function() {
		order_filter_params.search_text = vueLayout.orderSearch;
		order_filter_params.paging_info.page = 1;
		this.refresh_order_list();
		return false;
	}

	this.customer_order_list = function()
	{
		 this.refresh_order_list();
		 vueGlobal.modals.orderList = true;
	}

	this.customer_balance_history = function()
	{
		this.refresh_balance_history();
		vueGlobal.modals.balanceHistory = true;
	}

	this.refresh_balance_history = async function()
	{
		var payload = {
			page: balanceHistoryFilterParams.paging_info.page,
			t: Math.random()
		}
		const data = await theApiClient.callCafeApi('memberBalanceHistory','get',payload).catch(ICafeApiError.skip)
		if(!data)return;
		balanceHistoryFilterParams.paging_info = data.paging_info;
		vueBalanceHistory.items = JSON.parse(JSON.stringify(data.items))
		vueBalanceHistory.paging_info = JSON.parse(JSON.stringify(data.paging_info))
		vueBalanceHistory.summary = JSON.parse(JSON.stringify(data.summary))
		vueBalanceHistory.show_summary = data.show_summary !== false
		vueBalanceHistory.period_days = data.period_days ?? 30
		vueBalanceHistory.period_label = {7: translate_string('Last 7 days'), 15: translate_string('Last 15 days'), 30: translate_string('Last 30 days')}[vueBalanceHistory.period_days] || translate_string('All')
	}

	this.balance_history_page_first = function() {
		balanceHistoryFilterParams.paging_info.page = 1;
		this.refresh_balance_history();
	}

	this.balance_history_page_previous = function() {
		if (balanceHistoryFilterParams.paging_info.page > 1)
			balanceHistoryFilterParams.paging_info.page --;
		this.refresh_balance_history();
	}

	this.balance_history_page_next = function() {
		if (balanceHistoryFilterParams.paging_info.page < balanceHistoryFilterParams.paging_info.pages)
			balanceHistoryFilterParams.paging_info.page ++;
		this.refresh_balance_history();
	}

	this.balance_history_page_last = function(){
		balanceHistoryFilterParams.paging_info.page = balanceHistoryFilterParams.paging_info.pages;
		this.refresh_balance_history();
	}

	this.balance_history_page_go = function(index) {
		balanceHistoryFilterParams.paging_info.page = index;
		this.refresh_balance_history();
	}

	this.feedback_form_submit = async function()
	{
		var subject = vueLayout.feedbackSubject;
		var message = vueLayout.feedbackMessage;

		if (subject.length == 0) {
			sweetAlert("", translate_string("Subject can not be empty!"), "error");
			return false;
		}

		if (message.length == 0) {
			sweetAlert("", translate_string("Message can not be empty!"), "error");
			return false;
		}

		vueGlobal.isLoading = true;

		const token = await theApiClient.getToken()
		if(!token){
			vueGlobal.modals.feedback = false;
			vueGlobal.isLoading = false;
			return false;
		}
		const data = await theApiClient.callCafeApi('customerFeedback','post',{
				member_account: thePCStatus.member_account,
				subject: subject,
				message: message,
				pc_name: thePCInfo.pc_name
		}).catch(ICafeApiError.show).finally(()=>{
			vueGlobal.isLoading = false;
		})
		if(data)
			toast(translate_string("Your feedback has been sent"));
		vueGlobal.modals.feedback = false;

		return false;
	}

	this.change_password_form_submit = async function()
	{
		vueGlobal.isLoading = true;

		var old_password = vueLayout.oldPassword;
		var new_password = vueLayout.newPassword;
		var confirm_password = vueLayout.confirmPassword;

		if(old_password == '')
		{
			sweetAlert("", translate_string("Old password can not be empty!"), "error");
			vueGlobal.isLoading = false;
			return false;
		}
		if(new_password == '')
		{
			sweetAlert("", translate_string("New password can not be empty!"), "error");
			vueGlobal.isLoading = false;
			return false;
		}
		if(confirm_password == '')
		{
			sweetAlert("", translate_string("Confirm password can not be empty!"), "error");
			vueGlobal.isLoading = false;
			return false;
		}
		if(new_password != confirm_password)
		{
			sweetAlert("", translate_string("The new password and confirm password do not match!"), "error");
			vueGlobal.isLoading = false;
			return false;
		}
		const token = await theApiClient.getToken()
		if (!token) {
			vueGlobal.isLoading = false;
			vueGlobal.modals.changePassword = false;
			return false;
		}
		const data = await theApiClient.callCafeApi('memberChangePassword', 'post', {
			old_password: old_password,
			new_password: new_password,
			member_id: thePCStatus.member_id
		}).catch(ICafeApiError.show).finally(() => {
			vueGlobal.isLoading = false;
		})
		if(data)
			sweetAlert(translate_string("Succeed"), translate_string("The password was changed successfully."), "success");
		vueGlobal.modals.changePassword = false;

		return false;
	}

	this.customer_feedback = function()
	{
		vueLayout.feedbackSubject = '';
		vueLayout.feedbackMessage = '';

		vueGlobal.modals.feedback = true;
	}

	this.change_password_click = function()
	{
		vueLayout.oldPassword = '';
		vueLayout.newPassword = '';
		vueLayout.confirmPassword = '';

		vueGlobal.modals.changePassword = true;
	}
}

function ConvertToMember()
{
	this.init = function() {
		vueGlobal.menuButton.convertToMember = false;
		let license_convert_to_member_enable = typeof(theSettings.license_convert_to_member_enable) != 'undefined' ? theSettings.license_convert_to_member_enable : 0;
		if (license_convert_to_member_enable && is_logined() && (thePCStatus.member_group_id == MEMBER_GROUP_GUEST || thePCStatus.member_group_id == MEMBER_GROUP_PREPAID || thePCStatus.member_group_id == MEMBER_GROUP_OFFER))
			vueGlobal.menuButton.convertToMember = true;
	}

	this.show = function() {
		vueLayout.convertAccount = '';
		vueLayout.convertBirthday = '';
		vueLayout.convertPassword = '';
		vueLayout.convertConfirmPassword = '';
		vueLayout.convertFirstName = '';
		vueLayout.convertLastName = '';
		vueLayout.convertPhone = '';
		vueLayout.convertEmail = '';
		vueLayout.convertSmsCode = '';
		vueLayout.convertClubRuleChecked = false;
		vueLayout.convertPersonalDataChecked = false;
		vueLayout.convertPromoCode = '';
		vueGlobal.modals.convertMember = true;
	}

	this.show_club_rules = function () {
		vueGlobal.modals.clubRules = true;
	}

	this.show_personal_data = function () {
		vueGlobal.modals.personalData = true;
	}

	this.submit = async function() {
		var account = vueLayout.convertAccount;
		var birthday = vueLayout.convertBirthday;
		var password = vueLayout.convertPassword;
		var confirm_password = vueLayout.convertConfirmPassword;
		var first_name = vueLayout.convertFirstName;
		var last_name = vueLayout.convertLastName;
		var phone = vueLayout.convertPhone;
		var email = vueLayout.convertEmail;
		var promo_code = vueLayout.convertPromoCode;

		if(account.length === 0) {
			sweetAlert("", translate_string("Account can not be empty!"), "error");
			return false;
		}
		if(password.length === 0) {
			sweetAlert("", translate_string("Password can not be empty!"), "error");
			return false;
		}
		if(confirm_password.length === 0 || password != confirm_password) {
			sweetAlert("", translate_string("The new password and confirm password do not match!"), "error");
			return false;
		}
		if (phone && !/^(\+[1-9]\d{1,14}|[0-9]{5,15})$/.test(phone)) {
			sweetAlert("", translate_string("Phone number must contain digits only, with an optional + and country code, no spaces or dashes"), "error");
			return false;
		}
		if (email && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
			sweetAlert("", translate_string("Invalid email format"), "error");
			return false;
		}

		// 检查协议同意
		var register_agreement_enable = theSettings.register_agreement_enable ?? 0;
		if (register_agreement_enable == 1) {
			if (!vueLayout.convertClubRuleChecked || !vueLayout.convertPersonalDataChecked) {
				sweetAlert("", translate_string("Please agree to the club rules and privacy policy!"), "error");
				return false;
			}
		}

		const performSubmit = async () => {
			vueGlobal.isLoading = true;

			let token = await theApiClient.getToken()
			if (!token) {
				vueGlobal.isLoading = false;
				vueGlobal.modals.convertMember = false;
				return;
			}
			await theApiClient.callCafeApi('convertToMember', 'POST', {
				account: account,
				birthday: birthday,
				password: password,
				first_name: first_name,
				last_name: last_name,
				phone: phone,
				email: email,
				pc_name: thePCInfo.pc_name,
				id_card: vueLayout.convertIdCard,
				promo_code: promo_code
			}).then(() => {
				// vueGlobal.modals.convertMember = false;
			}).catch(ICafeApiError.show).finally(() => {
				vueGlobal.isLoading = false;
				vueGlobal.modals.convertMember = false;
			})
		}

		if (theSettings.sms_enable == 1) {
			if (!vueLayout.convertSmsCode) {
				sweetAlert("", translate_string("Please enter the SMS verification code!"), "error");
				return false;
			}

			// Mock vueRegister for helper function
			if (typeof vueRegister === 'undefined') {
				window.vueRegister = {};
			}
			vueRegister.phone = vueLayout.convertPhone;
			vueRegister.member_sms_code = vueLayout.convertSmsCode;

			SmsClassFun.verifySmscode(function (result) {
				if (result.code != 200) {
					sweetAlert("", translate_string(result && result.message ? result.message : 'SMS verification code mismatch'), "error");
					return false;
				}
				performSubmit();
			}, '#form-convert-member')
			return;
		}

		performSubmit();

	}

}

// 会员绑定 App 账号：会话中的会员出示动态二维码，App 扫码把该 member 绑到自己的 App 账号。
// 与 ScanLogin 同构，但走独立的 WSS action member_bind_status，两条链路互不干扰。
function MemberBind()
{
	this.expireTimerId = null;
	this.code = null; // 当前二维码 code，供 member_bind_status 推送比对，忽略旧码串扰

	// 打开弹窗：先查绑定状态。已绑过就只展示绑到了哪个 App 账号，不再出码
	this.show = async function () {
		vueGlobal.modals.bindApp = true;
		this.stop();
		this.code = null;
		this.clearQr();
		vueMemberBind.bound = false;
		vueMemberBind.expired = false;
		vueMemberBind.status = '';
		vueMemberBind.statusText = '';
		vueMemberBind.checking = true;
		vueMemberBind.loading = false;

		var b = await theApiClient
			.callApi(theApiClient.getCafeUrl('memberAppBinding'), 'GET')
			.catch(function () { return null; });

		vueMemberBind.checking = false;
		if (b && b.bound) {
			vueMemberBind.bound = true;
			vueMemberBind.boundEmail = b.icafe_user_email || '';
			vueMemberBind.boundName = b.icafe_user_name || '';
			vueMemberBind.boundAt = b.bind_time || '';
			return;
		}
		// 查不到绑定（含接口失败）就照常出码，宁可多给一次机会也别把入口堵死
		this.refresh();
	}

	this.refresh = async function () {
		this.stop();
		this.code = null;
		vueMemberBind.expired = false;
		vueMemberBind.status = '';
		vueMemberBind.statusText = '';
		vueMemberBind.boundEmail = '';
		vueMemberBind.loading = true;
		this.clearQr();

		var d = await theApiClient
			.callApi(theApiClient.getCafeUrl('memberBindCode'), 'POST', { source: 'client', pc_name: thePCInfo.pc_name })
			.catch(function () { return null; });

		vueMemberBind.loading = false;
		if (!d || !d.code) {
			vueMemberBind.expired = true;
			return;
		}
		this.code = d.code;

		var url = 'https://' + theApiClient.server_code + '.icafecloud.com/scan.htm?action=bindMember'
			+ '&code=' + encodeURIComponent(d.code)
			+ '&server=' + encodeURIComponent(theApiClient.server_code)
			+ '&from=client';

		PetiteVue.nextTick(function () {
			var el = document.querySelector('#member_bind_qr');
			if (!el)
				return;
			el.innerHTML = '';
			new QRCode(el, { text: url, width: 180, height: 180 });
			el.removeAttribute('title');
		});

		var that = this;
		this.expireTimerId = setTimeout(function () {
			that.code = null;
			that.clearQr();
			vueMemberBind.status = '';
			vueMemberBind.statusText = '';
			vueMemberBind.expired = true;
		}, (d.ttl || 120) * 1000);
	}

	this.clearQr = function () {
		var el = document.querySelector('#member_bind_qr');
		if (el)
			el.innerHTML = '';
	}

	this.stop = function () {
		if (this.expireTimerId) {
			clearTimeout(this.expireTimerId);
			this.expireTimerId = null;
		}
	}

	this.close = function () {
		this.stop();
		this.code = null;
		this.clearQr();
		vueGlobal.modals.bindApp = false;
	}
}

// @deprecated 向后兼容用，不要在新代码里调用。这些函数原先都定义在本文件（layout.js）里，
// 实现已经拆分并入 Member()/LockScreen()/SystemMenu()（system.js）/Shop（shop.js），
// 但主题 .htm 里 @click 曾直接调用这些裸函数名，版本库外可能存在的自定义主题副本
// （各网吧/代理商私下改过的 .htm）升级 core/js 时不会同步改动，仍会按旧的裸函数名调用，
// 所以在原来的位置保留这层薄包裹委托给新家。
function checklist() { return theMember.checklist(); } // @deprecated 用 theMember.checklist()
function order_page_first() { return theMember.order_page_first(); } // @deprecated 用 theMember.order_page_first()
function order_page_previous() { return theMember.order_page_previous(); } // @deprecated 用 theMember.order_page_previous()
function order_page_next() { return theMember.order_page_next(); } // @deprecated 用 theMember.order_page_next()
function order_page_last() { return theMember.order_page_last(); } // @deprecated 用 theMember.order_page_last()
function order_page_go(index) { return theMember.order_page_go(index); } // @deprecated 用 theMember.order_page_go()
function order_search_post() { return theMember.order_search_post(); } // @deprecated 用 theMember.order_search_post()
function customer_order_list() { return theMember.customer_order_list(); } // @deprecated 用 theMember.customer_order_list()
function customer_balance_history() { return theMember.customer_balance_history(); } // @deprecated 用 theMember.customer_balance_history()
function balance_history_page_first() { return theMember.balance_history_page_first(); } // @deprecated 用 theMember.balance_history_page_first()
function balance_history_page_previous() { return theMember.balance_history_page_previous(); } // @deprecated 用 theMember.balance_history_page_previous()
function balance_history_page_next() { return theMember.balance_history_page_next(); } // @deprecated 用 theMember.balance_history_page_next()
function balance_history_page_last() { return theMember.balance_history_page_last(); } // @deprecated 用 theMember.balance_history_page_last()
function balance_history_page_go(index) { return theMember.balance_history_page_go(index); } // @deprecated 用 theMember.balance_history_page_go()
function feedback_form_submit() { return theMember.feedback_form_submit(); } // @deprecated 用 theMember.feedback_form_submit()
function customer_feedback() { return theMember.customer_feedback(); } // @deprecated 用 theMember.customer_feedback()
function change_password_form_submit() { return theMember.change_password_form_submit(); } // @deprecated 用 theMember.change_password_form_submit()
function change_password_click() { return theMember.change_password_click(); } // @deprecated 用 theMember.change_password_click()
function lock_form_submit() { return theLockScreen.lock_form_submit(); } // @deprecated 用 theLockScreen.lock_form_submit()
function unlock_form_submit() { return theLockScreen.unlock_form_submit(); } // @deprecated 用 theLockScreen.unlock_form_submit()
function show_set_lockpassword_dialog() { return theLockScreen.show_set_lockpassword_dialog(); } // @deprecated 用 theLockScreen.show_set_lockpassword_dialog()
function audio_settings() { return theSystemMenu.audio_settings(); } // @deprecated 用 theSystemMenu.audio_settings()
function display_settings() { return theSystemMenu.display_settings(); } // @deprecated 用 theSystemMenu.display_settings()
function sound_settings() { return theSystemMenu.sound_settings(); } // @deprecated 用 theSystemMenu.sound_settings()
function mouse_settings() { return theSystemMenu.mouse_settings(); } // @deprecated 用 theSystemMenu.mouse_settings()
function system_language(params) { return theSystemMenu.system_language(params); } // @deprecated 用 theSystemMenu.system_language()
function getPaymentMethod(method) { return theShop.getPaymentMethod(method); } // @deprecated 用 theShop.getPaymentMethod()
