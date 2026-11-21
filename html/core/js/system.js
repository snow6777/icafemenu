function AudioSettings() 
{
	this.isDragging = false
	this.changeToHardwareTimeout = null
	this.currentTrack = null  // 存储当前正在拖动的轨道元素

	this.setup = () => {
		// 使用全局document事件监听鼠标移动和释放
		document.addEventListener("mousemove", (e) => {
			if (!this.isDragging || !this.currentTrack) return
			this.clientXChange(e.clientX)
		})

		document.addEventListener("mouseup", () => {
			this.isDragging = false
			this.currentTrack = null
		})
	}

	// 处理滑块手柄的mousedown事件（从模板调用）
	this.handleMouseDown = (e) => {
		this.isDragging = true
		// 从事件中获取轨道元素（手柄的父元素）
		this.currentTrack = e.target.closest('.volume-slider-track')
		e.preventDefault()
	}

	// 处理轨道点击事件（从模板调用）
	this.handleTrackClick = (e) => {
		const track = e.currentTarget
		const rect = track.getBoundingClientRect()
		let newVolume = Math.round(((e.clientX - rect.left) / rect.width) * 100)
		newVolume = Math.max(0, Math.min(100, newVolume))
		this.updateVolume(newVolume)
	}

	this.clientXChange = (x) => {
		// 使用存储的轨道元素引用，而非 querySelector
		if (!this.currentTrack) return
		
		const rect = this.currentTrack.getBoundingClientRect()
		let newVolume = Math.round(((x - rect.left) / rect.width) * 100)
		newVolume = Math.max(0, Math.min(100, newVolume))
		this.updateVolume(newVolume)
	}

	this.updateVolume = (newVolume) => {
		if (newVolume !== vueSystemSettings.volume) {
			vueSystemSettings.volume = newVolume
			vueSystemSettings.isMuted = false
			this.handleVolumeChange(newVolume)
		}
	}

	this.setVolumeMute = (volume, isMuted) => {
		vueSystemSettings.volume = volume
		vueSystemSettings.isMuted = isMuted
	}

	this.handleVolumeChange = (volume) => {
		this.handleChangeToHardware(volume, vueSystemSettings.isMuted);
	}

	this.toggleMute = () => {
		vueSystemSettings.isMuted = !vueSystemSettings.isMuted
		// 激活喇叭时设置音量为100%，禁止喇叭时设置音量为0%
		vueSystemSettings.volume = vueSystemSettings.isMuted ? 0 : 100
		this.handleChangeToHardware(vueSystemSettings.volume, vueSystemSettings.isMuted)
	}

	this.handleChangeToHardware = (volume, isMuted) => {
		if (this.changeToHardwareTimeout) {
			clearTimeout(this.changeToHardwareTimeout)
		}
		this.changeToHardwareTimeout = setTimeout(() => {
			ICAFEMENU_CORE.sendCommandToExe("VOLUME " + volume + " " + (isMuted ? "1" : "0"))
			this.changeToHardwareTimeout = null
		}, 500)
	}
}


function MouseSettings() {
	this.isDoubleClickDragging = false
	this.isMoveSpeedDragging = false
	this.doubleClickTimeout = null
	this.moveSpeedTimeout = null
	this.smoothnessTimeout = null
	this.doubleClickTrack = null  // 存储双击速度轨道元素
	this.moveSpeedTrack = null     // 存储移动速度轨道元素

	this.setup = () => {
		document.addEventListener("mousemove", (e) => {
			if (this.isDoubleClickDragging && this.doubleClickTrack) this.doubleClickXChange(e.clientX)
			if (this.isMoveSpeedDragging && this.moveSpeedTrack) this.moveSpeedXChange(e.clientX)
		})

		document.addEventListener("mouseup", () => {
			this.isDoubleClickDragging = false
			this.isMoveSpeedDragging = false
			this.doubleClickTrack = null
			this.moveSpeedTrack = null
		})
	}

	// 双击速度滑块事件处理（从模板调用）
	this.handleDoubleClickMouseDown = (e) => {
		this.isDoubleClickDragging = true
		this.doubleClickTrack = e.target.closest('.double-click-slider-track')
		e.preventDefault()
	}

	this.handleDoubleClickTrackClick = (e) => {
		const track = e.currentTarget
		const rect = track.getBoundingClientRect()
		let newSpeed = Math.round(((e.clientX - rect.left) / rect.width) * 10)
		newSpeed = Math.max(0, Math.min(10, newSpeed))
		this.updateDoubleClickSpeed(newSpeed)
	}

	// 移动速度滑块事件处理（从模板调用）
	this.handleMoveSpeedMouseDown = (e) => {
		this.isMoveSpeedDragging = true
		this.moveSpeedTrack = e.target.closest('.mouse-move-slider-track')
		e.preventDefault()
	}

	this.handleMoveSpeedTrackClick = (e) => {
		const track = e.currentTarget
		const rect = track.getBoundingClientRect()
		let newSpeed = Math.round(((e.clientX - rect.left) / rect.width) * 10)
		newSpeed = Math.max(0, Math.min(10, newSpeed))
		this.updateMoveSpeed(newSpeed)
	}

	this.doubleClickXChange = (x) => {
		// 使用存储的轨道元素引用
		if (!this.doubleClickTrack) return
		
		const rect = this.doubleClickTrack.getBoundingClientRect()
		let newSpeed = Math.round(((x - rect.left) / rect.width) * 10)
		newSpeed = Math.max(0, Math.min(10, newSpeed))
		this.updateDoubleClickSpeed(newSpeed)
	}

	this.updateDoubleClickSpeed = (newSpeed) => {
		if (newSpeed !== vueSystemSettings.doubleClickSpeed) {
			vueSystemSettings.doubleClickSpeed = newSpeed
			this.handleDoubleClickSpeedChange(newSpeed)
		}
	}

	this.setDoubleClickSpeed = (doubleClickSpeed) => {
		vueSystemSettings.doubleClickSpeed = doubleClickSpeed
	}

	this.handleDoubleClickSpeedChange = (doubleClickSpeed) => {
		if (this.doubleClickTimeout) {
			clearTimeout(this.doubleClickTimeout)
		}
		this.doubleClickTimeout = setTimeout(() => {
			ICAFEMENU_CORE.sendCommandToExe("MOUSE_DOUBLE_CLICK_SPEED " + doubleClickSpeed)
			this.doubleClickTimeout = null
		}, 500)
	}

	this.moveSpeedXChange = (x) => {
		// 使用存储的轨道元素引用
		if (!this.moveSpeedTrack) return
		
		const rect = this.moveSpeedTrack.getBoundingClientRect()
		let newSpeed = Math.round(((x - rect.left) / rect.width) * 10)
		newSpeed = Math.max(0, Math.min(10, newSpeed))
		this.updateMoveSpeed(newSpeed)
	}

	this.updateMoveSpeed = (newSpeed) => {
		if (newSpeed !== vueSystemSettings.moveSpeed) {
			vueSystemSettings.moveSpeed = newSpeed
			this.handleMoveSpeedChange(newSpeed)
		}
	}

	this.setMoveSpeed = (moveSpeed) => {
		vueSystemSettings.moveSpeed = moveSpeed
	}

	this.handleMoveSpeedChange = (moveSpeed) => {
		if (this.moveSpeedTimeout) {
			clearTimeout(this.moveSpeedTimeout)
		}
		this.moveSpeedTimeout = setTimeout(() => {
			ICAFEMENU_CORE.sendCommandToExe("MOUSE_MOVE_SPEED " + moveSpeed)
			this.moveSpeedTimeout = null
		}, 500)
	}

	this.setMouseSmoothness = (checked) => {
		vueSystemSettings.mouseSmoothness = checked
	}

	this.handleMouseSmoothnessChange = (checked) => {
		if (this.smoothnessTimeout) {
			clearTimeout(this.smoothnessTimeout)
		}
		this.smoothnessTimeout = setTimeout(() => {
			ICAFEMENU_CORE.sendCommandToExe("MOUSE_SMOOTHNESS " + (checked ? "1" : "0"))
			this.smoothnessTimeout = null
		}, 500)
	}
}

// PC 锁屏（跟 audio/mouse 设置不是一回事，PC 状态控制单独一个构造函数）
function LockScreen()
{
	this.lock_form_submit = function() {
		theLockScreenPassword = vueLayout.lockPassword;
		vueGlobal.modals.lock = false;

		ICAFEMENU_CORE.sendCommandToExe("LOCK 65535");
		ICAFEMENU_CORE.sendCommandToExe("SETWINDOWSIZE -1*-1");
		theLastWindowSize = "-1*-1";
		ICAFEMENU_CORE.sendCommandToExe("SETWINDOWTOPMOST 1");

		vueGlobal.isLocked = true;
		this.start_countdown();
		// 锁屏后继续沿用游戏页背景与页面样式，避免回退到默认背景。
		apply_game_background_visual();
		vueGlobal.bodyClass = 'bd-game-page';
		vueLayout.lockPassword = '';
		vueLayout.unlockPassword = '';

		return false;
	}

	// 锁屏最长时间（lock_max_mins，分钟），纯客户端计时。锁屏时提示一次，到点不解锁，直接发 request_checkout
	this.countdownTimerId = null;

	this.stop_countdown = function() {
		if (this.countdownTimerId !== null) {
			clearTimeout(this.countdownTimerId);
			this.countdownTimerId = null;
		}
	}

	this.start_countdown = function() {
		this.stop_countdown();
		let maxSecs = (parseInt(theSettings.lock_max_mins) || 0) * 60;
		if (maxSecs <= 0 || !is_logined())
			return;

		// 提示里用“X hours Y minutes”而不是 hh:mm，更易读
		let hours = Math.floor(maxSecs / 3600), mins = Math.floor(maxSecs % 3600 / 60), durationParts = [];
		if (hours > 0)
			durationParts.push(hours + ' ' + translate_string(hours == 1 ? 'hour' : 'hours'));
		if (mins > 0)
			durationParts.push(mins + ' ' + translate_string(mins == 1 ? 'minute' : 'minutes'));
		toast(translate_string('If not unlocked within {0}, this session will be checked out automatically').replace('{0}', durationParts.join(' ')));

		this.countdownTimerId = setTimeout(() => {
			this.countdownTimerId = null;
			// 已解锁或已登出（例如被 CP 提前 checkout）就不再处理
			if (!vueGlobal.isLocked || !is_logined())
				return;
			ICAFEMENU_CORE.wsssend('request_checkout', 'request', 'wss-server', { member_recent_played: theGame.member_recent_played, source: "client" });
		}, maxSecs * 1000);
	}

	this.unlock_form_submit = function() {
		var pwd = vueLayout.unlockPassword;
		if (pwd != theLockScreenPassword) {
			setTimeout(function() {
				sweetAlert("", translate_string("Wrong password!"), "error");
			},100);
			return false;
		}

		unlock_pc();

		return false;
	}

	this.show_set_lockpassword_dialog = function() {
		vueLayout.lockPassword = '';
		vueGlobal.modals.lock = true;
		PetiteVue.nextTick(() => document.getElementById('lockform_password')?.focus());
	}
}

// layout 菜单里的"系统设置"入口，内部调用 theAudioSettings/theMouseSettings 打开对应弹窗
function SystemMenu()
{
	this.audio_settings = function() {
		theAudioSettings.setup()
		ICAFEMENU_CORE.sendCommandToExe("VOLUME");
		vueGlobal.modals.audio = true;
	}

	this.display_settings = function() {
		ICAFEMENU_CORE.sendCommandToExe("RUN control.exe desk.cpl");
	}

	this.sound_settings = function() {
		ICAFEMENU_CORE.sendCommandToExe("RUN control.exe mmsys.cpl");
	}

	this.mouse_settings = function() {
		theMouseSettings.setup()
		ICAFEMENU_CORE.sendCommandToExe("MOUSE_DOUBLE_CLICK_SPEED")
		ICAFEMENU_CORE.sendCommandToExe("MOUSE_MOVE_SPEED")
		ICAFEMENU_CORE.sendCommandToExe("MOUSE_SMOOTHNESS")
		vueGlobal.modals.mouse = true;
	}

	this.system_language = function(params) {
		ICAFEMENU_CORE.sendCommandToExe("SYSTEM_LANGUAGE " + params)
	}

	// App 界面语言弹窗（跟上面 system_language 是两回事：那个是设置系统/输入法语言）。
	// 模板只调这一个方法，不直接在模板里从 theSettings 派生 vueGlobal.selectedLanguage 默认值
	this.open_language_modal = function() {
		vueGlobal.selectedLanguage = theSettings.license_lang || 'en';
		vueGlobal.modals.language = true;
	}
}
