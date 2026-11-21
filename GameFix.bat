set ServerIP=127.0.0.1
@chcp 65001 >nul
set "gamedrive=D:"
set "NetShareName=iCafeCloudShare"
set "NetShareSource=C:\iCafeCloudShare"
set "SaveShaders=1"
set "SaveSteamData=1"
set "ClearCsgoShader=1"
set "GameSave=1"
set "SteamAutoUpdate=-1"
set "ICafeHDD=0"
set "ClearSteamCache=1"
set "run_icafemenu_before_desktop=0"
set "is_hybrid_diskboot=0"

rem ==== Default gamefix ==== 
:: persist settings for idcfix scripts that run later at game launch and cannot receive cmd_client variables
if defined SteamAutoUpdate reg add "HKLM\SOFTWARE\iCafeCloud\GameFix" /f /v "SteamAutoUpdate" /t REG_SZ /d "%SteamAutoUpdate%" >nul


echo [GameFix] Apex >&2
rem ==== GameFix Apex ====
REM Apex
If exist "G:\ea\Apex" goto apex_install
goto apex_skip
:apex_install
	Reg.exe add "HKLM\SOFTWARE\Classes\Applications\r5apex.exe\shell\open\command" /ve /t REG_SZ /d "\"G:\ea\Apex\r5apex.exe\" \"%%1\"" /f
	Reg.exe add "HKLM\SOFTWARE\Respawn\Apex" /v "DisplayName" /t REG_SZ /d "Apex Legends" /f
	Reg.exe add "HKLM\SOFTWARE\Respawn\Apex" /v "Locale" /t REG_SZ /d "en_US" /f
	Reg.exe add "HKLM\SOFTWARE\Respawn\Apex" /v "Product GUID" /t REG_SZ /d "{D7FBF176-382D-484E-863A-DFD1124A2A1C}" /f
	Reg.exe add "HKLM\SOFTWARE\Respawn\Apex" /v "Install Dir" /t REG_SZ /d "G:\ea\Apex\\" /f
	Reg.exe add "HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\{D7FBF176-382D-484E-863A-DFD1124A2A1C}" /v "DisplayName" /t REG_SZ /d "Apex Legends" /f
	Reg.exe add "HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\{D7FBF176-382D-484E-863A-DFD1124A2A1C}" /v "DisplayVersion" /t REG_SZ /d "1.0.3.3" /f
	Reg.exe add "HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\{D7FBF176-382D-484E-863A-DFD1124A2A1C}" /v "DisplayIcon" /t REG_SZ /d "\"G:\ea\Apex\R5Apex.exe\"" /f
	Reg.exe add "HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\{D7FBF176-382D-484E-863A-DFD1124A2A1C}" /v "UninstallString" /t REG_SZ /d "\"C:\Program Files\Common Files\EAInstaller\Apex\Cleanup.exe\" uninstall_game -autologging" /f
	Reg.exe add "HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\{D7FBF176-382D-484E-863A-DFD1124A2A1C}" /v "InstallLocation" /t REG_SZ /d "G:\ea\Apex\\" /f
	Reg.exe add "HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\{D7FBF176-382D-484E-863A-DFD1124A2A1C}" /v "Publisher" /t REG_SZ /d "Electronic Arts, Inc." /f
	Reg.exe add "HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\{D7FBF176-382D-484E-863A-DFD1124A2A1C}" /v "URLInfoAbout" /t REG_SZ /d "http://www.ea.com" /f
	Reg.exe add "HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\{D7FBF176-382D-484E-863A-DFD1124A2A1C}" /v "EstimatedSize" /t REG_DWORD /d "40421995" /f
	Reg.exe add "HKLM\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\{D7FBF176-382D-484E-863A-DFD1124A2A1C}" /v "HelpLink" /t REG_SZ /d "G:\ea\Apex\Support\EA Help\Technical Support.en_US.rtf" /f
	Reg.exe add "HKLM\SOFTWARE\WOW6432Node\Origin Games\194908" /v "DisplayName" /t REG_SZ /d "Apex Legends™" /f
	Reg.exe add "HKLM\SOFTWARE\WOW6432Node\Origin Games\194908" /v "Locale" /t REG_SZ /d "en_US" /f
	Reg.exe add "HKLM\SOFTWARE\WOW6432Node\Respawn\Apex" /v "DisplayName" /t REG_SZ /d "Apex Legends" /f
	Reg.exe add "HKLM\SOFTWARE\WOW6432Node\Respawn\Apex" /v "Locale" /t REG_SZ /d "en_US" /f
	Reg.exe add "HKLM\SOFTWARE\WOW6432Node\Respawn\Apex" /v "Product GUID" /t REG_SZ /d "{D7FBF176-382D-484E-863A-DFD1124A2A1C}" /f
	Reg.exe add "HKLM\SOFTWARE\WOW6432Node\Respawn\Apex" /v "Install Dir" /t REG_SZ /d "G:\ea\Apex\\" /f
	Reg.exe add "HKLM\SOFTWARE\WOW6432Node\Respawn\Apex\InstallOptSelect" /ve /t REG_SZ /d "1" /f
:apex_skip

echo [GameFix] Battle.net >&2
rem ==== GameFix Battle.net ====

Reg.exe add "HKCR\battlenet" /f /ve /t REG_SZ /d "URL:Blizzard Battle.net Protocol"
Reg.exe add "HKCR\battlenet" /f /v "URL Protocol" /t REG_SZ /d ""
Reg.exe add "HKCR\battlenet\DefaultIcon" /f /ve /t REG_SZ /d "\"D:\Internet Tools\Battle.net\Battle.net.exe\",0"
Reg.exe add "HKCR\battlenet\shell\open\command" /f /ve /t REG_SZ /d "\"D:\Internet Tools\Battle.net\Battle.net.exe\" --uri=\"%%1\""

call :do_mklink "%LocalAppData%" "Battle.net" 0 "Battle.net\APPDATA\Local"
call :do_mklink "%ProgramData%" "Battle.net" 0 "Battle.net\ProgramData"



echo [GameFix] Call of Duty >&2
rem ==== GameFix Call of Duty ====
if not defined ServerIP goto call_of_duty_end
if %SaveShaders% neq 1 goto call_of_duty_end
call :netshare_client "%ServerIP%"
:: NET USE "\\%ServerIP%\%NetShareName%" "" /USER:guest /Y
if %errorlevel% equ 0 (
	REM fix call of duty shaders 
	call :do_mklink "%USERPROFILE%\Documents" "Call of Duty" 0 "\\%ServerIP%\%NetShareName%\pcs\%computername%\callofduty"
	call :do_mklink "%USERPROFILE%\Documents" "Call of Duty Modern Warfare" 0 "\\%ServerIP%\%NetShareName%\pcs\%computername%\callofdutywarzone"
	call :do_mklink "D:\Online Games\Program Files (x86)\Call of Duty\_retail_\cod24" "shadercache" 0 "\\%ServerIP%\%NetShareName%\pcs\%computername%\callofdutywarzone2"
	call :do_mklink "D:\Online Games\Program Files (x86)\Call of Duty\_retail_\cod25" "shadercache" 0 "\\%ServerIP%\%NetShareName%\pcs\%computername%\callofdutywarzone2"
)

:call_of_duty_end


echo [GameFix] Discord >&2
rem ==== GameFix Discord ====

call :do_mklink "%LocalAppData%" "Discord" 0 "Discord\LocalAppData"
call :do_mklink "%AppData%" "discord" 0 "Discord\AppData"


echo [GameFix] EA Games >&2
rem ==== GameFix EA Games ====
sc query | find /I "EABackgroundService"
if %errorlevel% equ 0 (
	sc stop EABackgroundService
)
tasklist | find "EADesktop.exe"
if %errorlevel% neq 0 goto ea_next
taskkill /F /IM EADesktop.exe
sc query | find /I "EABackgroundService"
if %errorlevel% equ 0 (
	sc stop EABackgroundService
)
timeout 2

:ea_next
call :do_mklink "%LocalAppData%" "Electronic Arts" 0 "EA\AppData\Local"
call :do_mklink "%LocalAppData%" "EADesktop" 0 "EA\EADesktop\LocalAppData"
call :do_mklink "%ProgramData%" "EA Desktop" 0 "EA\ProgramData"
call :do_mklink "%ProgramFiles%" "Electronic Arts" 0 "%gamedrive%\Program Files\Electronic Arts"
call :do_mklink "%ProgramFiles%" "EA Games" 0 "%gamedrive%\Program Files\EA Games"
set "eaDefaultPath=C:\Program Files\Electronic Arts\EA Desktop\EA Desktop"

If exist "%eaDefaultPath%\EALauncher.exe" goto EALauncher_install
goto EALauncher_skip
:EALauncher_install
	REM import Origin.reg

	Reg.exe add "HKLM\software\classes\eadm\shell\open\command" /f /ve /t REG_SZ /d "\"%eaDefaultPath%\EALauncher.exe\" \"%%1\""
	Reg.exe add "HKLM\software\classes\ealink\shell\open\command" /f /ve /t REG_SZ /d "\"%eaDefaultPath%\legacyPM\OriginLegacyCLI.exe\" \"%%1\" -wait"
	Reg.exe add "HKLM\software\classes\ealink\DefaultIcon" /f /ve /t REG_SZ /d "\"%eaDefaultPath%\legacyPM\OriginLegacyCLI.exe\",-107"
	Reg.exe add "HKLM\software\classes\origin\shell\open\command" /f /ve /t REG_SZ /d "\"%eaDefaultPath%\EALauncher.exe\" \"%%1\""
	Reg.exe add "HKLM\software\classes\origin2\shell\open\command" /f /ve /t REG_SZ /d "\"%eaDefaultPath%\EALauncher.exe\" \"%%1\""

	Reg.exe add "HKLM\SOFTWARE\Electronic Arts\EA Core" /f /v "ClientVersion" /t REG_SZ /d "7.0.0.1"
	Reg.exe add "HKLM\SOFTWARE\Electronic Arts\EA Core" /f /v "ClientPath" /t REG_SZ /d "%eaDefaultPath%\legacyPM\OriginLegacyCLI.exe"
	Reg.exe add "HKLM\SOFTWARE\Electronic Arts\EA Core" /f /v "ClientAccessDLLPath" /t REG_SZ /d "%eaDefaultPath%\legacyPM\CmdPortalClient.dll"
	Reg.exe add "HKLM\SOFTWARE\Electronic Arts\EA Core" /f /v "EADM6Version" /t REG_SZ /d "7.0.0.1"
	Reg.exe add "HKLM\SOFTWARE\Electronic Arts\EA Core" /f /v "EADM6InstallDir" /t REG_SZ /d "%eaDefaultPath%\legacyPM"

	Reg.exe add "HKLM\SOFTWARE\Electronic Arts\EADM" /f /v "ClientVersion" /t REG_SZ /d "10.4.5.30491"
	Reg.exe add "HKLM\SOFTWARE\Electronic Arts\EADM" /f /v "ClientPath" /t REG_SZ /d "%eaDefaultPath%\EADesktop.exe"

	Reg.exe add "HKLM\SOFTWARE\Wow6432Node\Electronic Arts\EA Core" /f /v "ClientVersion" /t REG_SZ /d "7.0.0.1"
	Reg.exe add "HKLM\SOFTWARE\Wow6432Node\Electronic Arts\EA Core" /f /v "ClientPath" /t REG_SZ /d "%eaDefaultPath%\legacyPM\OriginLegacyCLI.exe"
	Reg.exe add "HKLM\SOFTWARE\Wow6432Node\Electronic Arts\EA Core" /f /v "ClientAccessDLLPath" /t REG_SZ /d "%eaDefaultPath%\legacyPM\CmdPortalClient.dll"
	Reg.exe add "HKLM\SOFTWARE\Wow6432Node\Electronic Arts\EA Core" /f /v "EADM6Version" /t REG_SZ /d "7.0.0.1"
	Reg.exe add "HKLM\SOFTWARE\Wow6432Node\Electronic Arts\EA Core" /f /v "EADM6InstallDir" /t REG_SZ /d "%eaDefaultPath%\legacyPM"

	Reg.exe add "HKLM\SOFTWARE\Wow6432Node\Electronic Arts\EADM" /f /v "ClientVersion" /t REG_SZ /d "10.4.5.30491"
	Reg.exe add "HKLM\SOFTWARE\Wow6432Node\Electronic Arts\EADM" /f /v "ClientPath" /t REG_SZ /d "%eaDefaultPath%\EADesktop.exe"

	Reg.exe add "HKLM\SOFTWARE\Wow6432Node\Electronic Arts\EA Desktop" /f /v "DesktopAppPath" /t REG_SZ /d "%eaDefaultPath%\EADesktop.exe"
	Reg.exe add "HKLM\SOFTWARE\Wow6432Node\Electronic Arts\EA Desktop" /f /v "LauncherAppPath" /t REG_SZ /d "%eaDefaultPath%\EALauncher.exe"
	Reg.exe add "HKLM\SOFTWARE\Wow6432Node\Electronic Arts\EA Desktop" /f /v "EaConnectMsAppPath" /t REG_SZ /d "%eaDefaultPath%\EAConnect_microsoft.exe"
	Reg.exe add "HKLM\SOFTWARE\Wow6432Node\Electronic Arts\EA Desktop" /f /v "ErrorReporterPath" /t REG_SZ /d "%eaDefaultPath%\ErrorReporter.exe"
	Reg.exe add "HKLM\SOFTWARE\Wow6432Node\Electronic Arts\EA Desktop" /f /v "ClientPath" /t REG_SZ /d "%eaDefaultPath%\EADesktop.exe"
	Reg.exe add "HKLM\SOFTWARE\Wow6432Node\Electronic Arts\EA Desktop" /f /v "InstallLocation" /t REG_SZ /d "%eaDefaultPath%"
	Reg.exe add "HKLM\SOFTWARE\Wow6432Node\Electronic Arts\EA Desktop" /f /v "InstallSuccesfull" /t REG_SZ /d "true"

	2>nul sc delete "EABackgroundService"
	sc create "EABackgroundService" binPath="\"%eaDefaultPath%\EABackgroundService.exe\" -start"
	sc description "EABackgroundService" "EA app Background Service"
	REM https://www.advancedinstaller.com/forums/viewtopic.php?t=49990
	sc sdset "EABackgroundService" "D:(A;;CCDCLCSWRPWPDTLOCRSDRCWDWO;;;WD)"

	REM Origin's protocol
	Reg.exe add "HKCR\origin" /f /ve /t REG_SZ /d "URL:ORIGIN Protocol"
	Reg.exe add "HKCR\origin" /f /v "URL Protocol" /t REG_SZ /d ""
	Reg.exe add "HKCR\origin\shell\open\command" /f /ve /t REG_SZ /d "\"%eaDefaultPath%\EALauncher.exe\" \"%%1\""
	Reg.exe add "HKCR\ealink" /f /ve /t REG_SZ /d "URL:ealink Protocol"
	Reg.exe add "HKCR\ealink" /f /v "URL Protocol" /t REG_SZ /d ""
	Reg.exe add "HKCR\ealink\DefaultIcon" /f /ve /t REG_SZ /d "\"%eaDefaultPath%\legacyPM\OriginLegacyCLI.exe\",-107"
	Reg.exe add "HKCR\ealink\shell\open\command" /f /ve /t REG_SZ /d "\"%eaDefaultPath%\legacyPM\OriginLegacyCLI.exe\" \"%%1\" -wait"
:EALauncher_skip

call :create_desktop_shortcut "EA" "%eaDefaultPath%\EADesktop.exe" "%eaDefaultPath%"


echo [GameFix] Epic Games >&2
rem ==== GameFix Epic Games ====
tasklist | find "EpicGamesLauncher.exe"
if %errorlevel% equ 0 (
	taskkill /F /IM "EpicGamesLauncher.exe"
	timeout 2
)

REM All Epic gamefix data consolidated under a single top-level "GameFixes\Epic Games"
call :do_mklink "%LocalAppData%" "EpicGamesLauncher" 0 "Epic Games\EpicGamesLauncher\AppData\Local"
call :do_mklink "%LocalAppData%" "Epic Games" 0 "Epic Games\EpicGames\AppData\Local"
call :do_mklink "%LocalAppData%" "EpicOnlineServicesUIHelper" 0 "Epic Games\EpicOnlineServicesUIHelper\AppData\Local"
call :do_mklink "%LocalAppData%" "FortniteGame" 0 "Epic Games\FortniteGame\AppData\Local"
call :do_mklink "%ProgramData%" "Epic" 0 "Epic Games\Epic\ProgramData"
REM New Epic launcher installs itself and all games into "%ProgramFiles%\Epic Games" - path is not selectable
call :do_mklink "%ProgramFiles%" "Epic Games" 0 "Epic Games\EpicGames\ProgramFiles"
REM EOS binaries live under the x86 Program Files tree, in Epic Games\Epic Online Services - link them so EOS is present
call :do_mklink "%ProgramFiles(x86)%" "Epic Games" 0 "Epic Games\EpicGames-x86\ProgramFiles"

REM New layout keeps the launcher in "%ProgramFiles%\Epic Games\Launcher"; fall back to the legacy user-selected path
set "EPIC_LAUNCHER_EXE=D:\Internet Tools\Epic Games\Launcher\Portal\Binaries\Win64\EpicGamesLauncher.exe"
if exist "%ProgramFiles%\Epic Games\Launcher\Portal\Binaries\Win64\EpicGamesLauncher.exe" set "EPIC_LAUNCHER_EXE=%ProgramFiles%\Epic Games\Launcher\Portal\Binaries\Win64\EpicGamesLauncher.exe"

REM Epic Games Launcher's protocol
Reg.exe add "HKCR\com.epicgames.launcher" /f /ve /t REG_SZ /d "Epic Games Launcher Link"
Reg.exe add "HKCR\com.epicgames.launcher" /f /v "URL Protocol" /t REG_SZ /d ""
Reg.exe add "HKCR\com.epicgames.launcher\DefaultIcon" /f /ve /t REG_SZ /d "%EPIC_LAUNCHER_EXE%,0"
Reg.exe add "HKCR\com.epicgames.launcher\shell" /f /ve /t REG_SZ /d "open"
Reg.exe add "HKCR\com.epicgames.launcher\shell\open\command" /f /ve /t REG_SZ /d "\"%EPIC_LAUNCHER_EXE%\" %%1"

REM Resolve the EOS install dir on a standalone line first - keeps its x86 parentheses out of any comment or if/for block
set "EOS_DIR=%ProgramFiles(x86)%\Epic Games\Epic Online Services"

REM Epic Games Launcher registry branch + AppDataPath - points at the junctioned ProgramData\Epic
Reg.exe add "HKLM\SOFTWARE\WOW6432Node\Epic Games" /f
Reg.exe add "HKLM\SOFTWARE\WOW6432Node\Epic Games\EpicGamesLauncher" /f
Reg.exe add "HKLM\SOFTWARE\WOW6432Node\Epic Games\EpicGamesLauncher" /v "AppDataPath" /t REG_SZ /d "%ProgramData%\Epic\EpicGamesLauncher\Data\\" /f

REM EOS: import the server-captured registry - has the Version values the new launcher checks;
REM fall back to the minimal Path keys if eos.reg is missing - paths resolve through the x86 junction
if exist "%gamedrive%\GameFixes\Epic Games\eos.reg" (
	reg import "%gamedrive%\GameFixes\Epic Games\eos.reg"
) else (
	Reg.exe add "HKLM\SOFTWARE\WOW6432Node\Epic Games\EOS" /f
	Reg.exe add "HKLM\SOFTWARE\WOW6432Node\Epic Games\EOS\InstallHelper" /v "Path" /t REG_SZ /d "%EOS_DIR%\EpicOnlineServicesInstallHelper.exe" /f
	Reg.exe add "HKLM\SOFTWARE\WOW6432Node\Epic Games\EOS\MainService" /v "Path" /t REG_SZ /d "%EOS_DIR%\service\EpicOnlineServicesHost.exe" /f
	Reg.exe add "HKLM\SOFTWARE\WOW6432Node\Epic Games\EOS\UIHelper" /v "Path" /t REG_SZ /d "%EOS_DIR%\EpicOnlineServicesUIHelper.exe" /f
	Reg.exe add "HKLM\SOFTWARE\WOW6432Node\Epic Games\EOS\UserHelper" /v "Path" /t REG_SZ /d "%EOS_DIR%\EpicOnlineServicesUserHelper.exe" /f
)

REM Register the two Epic Windows services via sc create so SCM enumerates them as real installed services
REM Type/Start/ErrorControl/Security are written by SCM itself. A bare "Reg.exe add" only drops loose values
REM and leaves an incomplete key that SCM does NOT treat as an installed service, so the launcher pops the
REM "needs admin to enable startup functionality" dialog on login to re-install EpicGamesUpdater. sc delete +
REM reg delete first keeps this idempotent and clears any old reg-only residue.
sc stop   EpicOnlineServices >nul 2>&1
sc delete EpicOnlineServices >nul 2>&1
Reg.exe delete "HKLM\SYSTEM\CurrentControlSet\Services\EpicOnlineServices" /f >nul 2>&1
sc create EpicOnlineServices binPath= "\"%EOS_DIR%\service\EpicOnlineServicesHost.exe\"" start= demand obj= LocalSystem DisplayName= "Epic Online Services"

set "EPIC_UPDATER_EXE=D:\Internet Tools\Epic Games\Launcher\Portal\Binaries\Win64\EpicGamesUpdater.exe"
if exist "%ProgramFiles%\Epic Games\Launcher\Portal\Binaries\Win64\EpicGamesUpdater.exe" set "EPIC_UPDATER_EXE=%ProgramFiles%\Epic Games\Launcher\Portal\Binaries\Win64\EpicGamesUpdater.exe"
sc stop   EpicGamesUpdater >nul 2>&1
sc delete EpicGamesUpdater >nul 2>&1
Reg.exe delete "HKLM\SYSTEM\CurrentControlSet\Services\EpicGamesUpdater" /f >nul 2>&1
sc create EpicGamesUpdater binPath= "\"%EPIC_UPDATER_EXE%\"" start= demand obj= LocalSystem DisplayName= "Epic Games Updater"
sc description EpicGamesUpdater "Runs the software update installation for Epic Games Launcher"

if exist "%localappdata%\EpicGamesLauncher\Saved\Config\WindowsEditor\GameUserSettings.ini" (
	call :replace_file_string "%localappdata%\EpicGamesLauncher\Saved\Config\WindowsEditor\GameUserSettings.ini" "Enable=True" "Enable=False"
)

if exist "%localappdata%\EpicGamesLauncher\Saved\Config\Windows\GameUserSettings.ini" (
	call :replace_file_string "%localappdata%\EpicGamesLauncher\Saved\Config\Windows\GameUserSettings.ini" "Enable=True" "Enable=False"
)


echo [GameFix] FIFA 23 >&2
rem ==== GameFix FIFA 23 ====
REM FIFA 23

If exist "D:\Online Games\ea\EA SPORTS FC 26" goto FIFA23_install
goto FIFA23_skip
:FIFA23_install
	Reg.exe add "HKLM\SOFTWARE\EA Sports\FIFA 23" /f /v "DisplayName" /t REG_SZ /d "FIFA 23"
	Reg.exe add "HKLM\SOFTWARE\EA Sports\FIFA 23" /f /v "Product GUID" /t REG_SZ /d "{B2A14ADC-C2DC-432C-BA7E-FA59282364AB}"
	Reg.exe add "HKLM\SOFTWARE\EA Sports\FIFA 23" /f /v "Install Dir" /t REG_SZ /d "D:\Online Games\ea\EA SPORTS FC 26\\"
	Reg.exe add "HKLM\SOFTWARE\EA Sports\FIFA 23\InstallOptSelect" /f /ve /t REG_SZ /d "1"
:FIFA23_skip


echo [GameFix] FiveM >&2
rem ==== GameFix FiveM ====

call :do_mklink "%LocalAppData%" "FiveM" 0 "FiveM\LocalAppData"


echo [GameFix] Gameloop >&2
rem ==== GameFix Gameloop ====
tasklist | find /i "AppMarket.exe"
if %errorlevel% equ 0 (
	taskkill /F /IM AppMarket.exe /T
	timeout 2
)

rem take over share directly - source_copy=0
call :do_mklink "%LocalAppData%\Tencent" "TxGameAssistant" 0 "Gameloop\LocalAppData\Tencent\TxGameAssistant"
call :do_mklink "%LocalAppData%\Tencent" "QQGuild" 0 "Gameloop\LocalAppData\Tencent\QQGuild"
call :do_mklink "%ProgramData%\Tencent" "qimei" 0 "Gameloop\ProgramData\Tencent\qimei"
call :do_mklink "%ProgramData%\Tencent" "QQPCMgr" 0 "Gameloop\ProgramData\Tencent\QQPCMgr"
call :do_mklink "%ProgramData%\Tencent" "TxGameAssistant" 0 "Gameloop\ProgramData\Tencent\TxGameAssistant"
call :do_mklink "%AppData%\Tencent" "MobileGamePC" 0 "Gameloop\AppData\Roaming\Tencent\MobileGamePC"
call :do_mklink "%AppData%\Tencent" "Androws" 0 "Gameloop\AppData\Roaming\Tencent\Androws"

rem restore registry snapshot exported by server.bat - versions/paths come from whatever server.bat last exported
if exist "D:\Program Files\TxGameAssistant\Tencent.reg" reg import "D:\Program Files\TxGameAssistant\Tencent.reg"
if exist "D:\Program Files\TxGameAssistant\Tencent2.reg" reg import "D:\Program Files\TxGameAssistant\Tencent2.reg"
if exist "D:\Program Files\TxGameAssistant\Uninstall.reg" reg import "D:\Program Files\TxGameAssistant\Uninstall.reg"
if exist "D:\Program Files\TxGameAssistant\Classes_apk.reg" reg import "D:\Program Files\TxGameAssistant\Classes_apk.reg"
if exist "D:\Program Files\TxGameAssistant\Classes_protocol.reg" reg import "D:\Program Files\TxGameAssistant\Classes_protocol.reg"


echo [GameFix] iCafeMenu >&2
rem ==== GameFix iCafeMenu ====

reg.exe add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" /f /v Userinit /t REG_SZ /d "C:\Windows\system32\userinit.exe,"
reg.exe add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" /f /v Shell /t REG_SZ /d "explorer.exe"
if not defined ServerIP goto icafemenu_end
set isServer=0
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr "IPv4"') do (
	if "%%i" equ " %ServerIP%" set isServer=1
)
If "%isServer%"=="0" (
	if "%is_hybrid_diskboot%" == "1" (
		rem Hybrid - 有盘启动+PXE 模式，这台机器可能正跑在 ccboot 的有盘启动
		rem 标准用户 Player 账户下，不能再往 Userinit/Run 写 iCafeMenu.exe 自
		rem 己拉起来 - 这两条路径拉起来的 iCafeMenu.exe 都是零参数启动，会走
		rem 它自己的 UAC 自我提权逻辑，标准用户账户下会直接卡死。iCafeMenu.exe
		rem 改由 ccboot 的 CCBootClient.exe - DiskBootStartupLauncher 用已经
		rem 提权好的令牌拉起，详见 ccboot 仓库 CLAUDE.md。
	) else (
		if "%run_icafemenu_before_desktop%" == "1" (
			reg.exe add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" /f /v Userinit /t REG_SZ /d "C:\Windows\system32\userinit.exe,%~dp0iCafeMenu.exe,"
		) else (
			reg.exe add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" /f /v iCafeMenu /t REG_SZ /d "%~dp0iCafeMenu.exe"
		)
	)

)

if %SaveShaders% neq 1 goto icafemenu_end
call :netshare_client "%ServerIP%"
:: NET USE "\\%ServerIP%\iCafeCloudShare" "" /USER:guest /Y
if %errorlevel% equ 0 (
	REM source_copy=1: do_mklink deletes the local dir either way, so source_copy=0 discarded the
	REM local log entirely instead of preserving it - that showed up as the log getting truncated.
	REM source_copy=1 copies local content to the remote target first, so only same-named files
	REM risk being overwritten, which is a much smaller risk than losing everything.
	call :do_mklink "%~dp0" "Log" 1 "\\%ServerIP%\iCafeCloudShare\pcs\%computername%\log"
)

:icafemenu_end


echo [GameFix] Marvel Rivals [Steam] >&2
rem ==== GameFix Marvel Rivals [Steam] ====
tasklist | find "MarvelRivals_Launcher.exe"
if %errorlevel% neq 0 goto marvel_rivals_launcher_next
taskkill /F /IM MarvelRivals_Launcher.exe
timeout 2
:marvel_rivals_launcher_next

call :do_mklink "%AppData%" "MarvelRivals_Launcher" 0 "MarvelRivals_Launcher\Roaming"
call :do_mklink "%LocalAppData%" "MarvelRivals_Launcher" 0 "MarvelRivals_Launcher\LocalAppData"

if not defined ServerIP goto marvel_rivals_shader_end
if %SaveShaders% neq 1 goto marvel_rivals_shader_end
call :netshare_client "%ServerIP%"
if %errorlevel% neq 0 goto marvel_rivals_shader_end
call :do_mklink "%LocalAppData%\Marvel" "Saved" 0 "\\%ServerIP%\%NetShareName%\pcs\%computername%\MarvelSaved"
:marvel_rivals_shader_end


echo [GameFix] Minecraft >&2
rem ==== GameFix Minecraft ====

call :do_mklink "%AppData%" ".minecraft" 0 "minecraft\AppData"
call :do_mklink "%AppData%" ".tlauncher" 0 "minecraft\tlauncher\AppData"

del "%AppData%\.tlauncher\tlauncher-2.0.properties" /Q


echo [GameFix] PUBG Mobile >&2
rem ==== GameFix PUBG Mobile ====
REM Superseded by the unified Gameloop gamefix; intentionally left empty - no-op in any run order.


echo [GameFix] Riot >&2
rem ==== GameFix Riot ====
tasklist | find "RiotClientServices.exe"
if %errorlevel% equ 0 (
	taskkill /F /IM RiotClientServices.exe
	timeout 2
)

call :do_mklink "%LocalAppData%" "Riot Games" 0 "Riot Games\AppData\Local"
call :do_mklink "%ProgramData%" "Riot Games" 0 "Riot Games\ProgramData"

Reg.exe add "HKCR\riotclient" /ve /t REG_SZ /d "URL:Riot Games Protocol" /f
Reg.exe add "HKCR\riotclient" /v "URL Protocol" /t REG_SZ /d "" /f
Reg.exe add "HKCR\riotclient\DefaultIcon" /ve /t REG_SZ /d "\"D:\Online Games\Riot Games\Riot Client\RiotClientServices.exe\",0" /f
Reg.exe add "HKCR\riotclient\shell\open\command" /ve /t REG_SZ /d "\"D:\Online Games\Riot Games\Riot Client\RiotClientServices.exe\" --app-command=\"%%1\"" /f


echo [GameFix] Roblox >&2
rem ==== GameFix Roblox ====
tasklist | find "RobloxPlayerBeta.exe"
if %errorlevel% neq 0 goto roblox_next
taskkill /F /IM RobloxPlayerBeta.exe

timeout 2
:roblox_next

call :do_mklink "%ProgramFiles%" "Roblox" 0 "Roblox\ProgramFiles"
call :do_mklink "%ProgramFiles(x86)%" "Roblox" 0 "Roblox\ProgramFiles(x86)"

if not defined ServerIP goto roblox_end
if %SaveShaders% neq 1 goto roblox_end
call :netshare_client "%ServerIP%"
:: NET USE "\\%ServerIP%\%NetShareName%" "" /USER:guest /Y
if %errorlevel% equ 0 (
	call :do_mklink "C:\Users\%username%\AppData\Local\Roblox" "shaders" 0 "\\%ServerIP%\%NetShareName%\pcs\%computername%\RobloxShaders"
)

:roblox_end


echo [GameFix] Steam >&2
rem ==== GameFix Steam ====
tasklist | find "steam.exe"
if %errorlevel% equ 0 (
	"D:\Internet Tools\Steam\steam.exe" -shutdown
	timeout 2
)

set "STEAM_SAVE_ACTIVE=0"
:: older generators do not define SaveSteamData, default to enabled
if not defined SaveSteamData set "SaveSteamData=1"
if not defined ClearCsgoShader set "ClearCsgoShader=1"
if not defined ServerIP goto steam_end_save
if %SaveShaders% neq 1 if %SaveSteamData% neq 1 goto steam_end_save
call :netshare_client "%ServerIP%"
:: NET USE "\\%ServerIP%\%NetShareName%" "" /USER:guest /Y
if %errorlevel% neq 0 goto steam_end_save
:: fix steam apps shaders, controlled by SaveShaders only
if %SaveShaders% equ 1 call :do_mklink "D:\Internet Tools\Steam\steamapps" "shadercache" 0 "\\%ServerIP%\%NetShareName%\pcs\%computername%\SteamAppShaderCache"
:: CS2 shader cache loads slower from the share than rebuilding, clear it once per iCafeMenu start in background when ClearCsgoShader is on
if %SaveShaders% equ 1 if %ClearCsgoShader% equ 1 if exist "D:\Internet Tools\Steam\steamapps\shadercache\730" start "" /b cmd /c rmdir /s /q "D:\Internet Tools\Steam\steamapps\shadercache\730"
:: steam userdata, controlled by SaveSteamData only
if %SaveSteamData% neq 1 goto steam_end_save
call :do_mklink "D:\Internet Tools\Steam" "userdata" 0 "\\%ServerIP%\%NetShareName%\pcs\%computername%\SteamData"
set "STEAM_SAVE_ACTIVE=1"

:steam_end_save

call :do_mklink "%LocalAppData%" "Steam" 0 "Steam\AppData\Local"
call :do_mklink "%ProgramData%" "Steam" 0 "Steam\ProgramData"
call :do_mklink "%CommonProgramFiles(x86)%" "Steam" 0 "Steam\CommonProgramFiles(x86)"

Reg.exe add "HKCR\steam" /f /ve /t REG_SZ /d "URL:steam protocol"
Reg.exe add "HKCR\steam" /f /v "URL Protocol" /t REG_SZ /d ""
Reg.exe add "HKCR\steam\DefaultIcon" /f /ve /t REG_SZ /d "steam.exe"
Reg.exe add "HKCR\steam\Shell\Open\Command" /f /ve /t REG_SZ /d "\"D:\Internet Tools\Steam\steam.exe\" -- \"%%1\""
Reg.exe add "HKCR\steamlink" /f /ve /t REG_SZ /d "URL:steamlink protocol"
Reg.exe add "HKCR\steamlink" /f /v "URL Protocol" /t REG_SZ /d ""
Reg.exe add "HKCR\steamlink\DefaultIcon" /f /ve /t REG_SZ /d "steam.exe"
Reg.exe add "HKCR\steamlink\Shell\Open\Command" /f /ve /t REG_SZ /d "\"D:\Internet Tools\Steam\steam.exe\" -- \"%%1\""

Reg.exe add "HKLM\SOFTWARE\Wow6432Node\Valve\Steam" /f /v "InstallPath" /t REG_SZ /d "D:\Internet Tools\Steam"
Reg.exe add "HKLM\SOFTWARE\Wow6432Node\Valve\Steam" /f /v "TempAppCmdLine" /t REG_SZ /d ""
Reg.exe add "HKLM\SOFTWARE\Wow6432Node\Valve\Steam" /f /v "ReLaunchCmdLine" /t REG_SZ /d ""
Reg.exe add "HKLM\SOFTWARE\Wow6432Node\Valve\Steam" /f /v "Universe" /t REG_SZ /d "Public"
Reg.exe add "HKLM\SOFTWARE\Wow6432Node\Valve\Steam" /f /v "BetaName" /t REG_SZ /d ""
Reg.exe add "HKLM\SOFTWARE\Wow6432Node\Valve\Steam" /f /v "SteamPID" /t REG_DWORD /d "0"
Reg.exe add "HKLM\SOFTWARE\Wow6432Node\Valve\Steam" /f /v "ClientLauncherType" /t REG_DWORD /d "0"
Reg.exe add "HKLM\SOFTWARE\Wow6432Node\Valve\SteamService" /f /v "installpath_default" /t REG_SZ /d "D:\Internet Tools\Steam"

(echo HKEY_LOCAL_MACHINE\SOFTWARE\Wow6432Node\Valve [1 5 7 17]) > "%temp%\steam_perm.txt" && regini "%temp%\steam_perm.txt" && del "%temp%\steam_perm.txt"
(echo HKEY_LOCAL_MACHINE\SOFTWARE\Wow6432Node\Valve\Steam [1 5 7 17]) > "%temp%\steam_perm.txt" && regini "%temp%\steam_perm.txt" && del "%temp%\steam_perm.txt"
(echo HKEY_LOCAL_MACHINE\SOFTWARE\Wow6432Node\Valve\SteamService [1 5 7 17]) > "%temp%\steam_perm.txt" && regini "%temp%\steam_perm.txt" && del "%temp%\steam_perm.txt"

sc query "Steam Client Service" >nul 2>&1
if errorlevel 1 goto steam_svc_not_exist
sc stop "Steam Client Service" 2>nul
:steam_wait_svc_stop
sc query "Steam Client Service" | find "STOPPED" >nul 2>&1
if errorlevel 1 (timeout /t 1 /nobreak >nul & goto steam_wait_svc_stop)
sc delete "Steam Client Service" 2>nul
timeout /t 1 /nobreak >nul
:steam_svc_not_exist
sc create "Steam Client Service" binPath= "\"%CommonProgramFiles(x86)%\Steam\SteamService.exe\" /RunAsService" start= demand obj= "LocalSystem"
sc description "Steam Client Service" "Steam Client Service monitors and updates Steam content"
sc sdset "Steam Client Service" "O:SYG:SYD:(A;;CCLCSWLOCRRC;;;IU)(A;;CCLCSWLOCRRC;;;SU)(A;;CCLCSWRPWPDTLOCRRC;;;SY)(A;;CCDCLCSWRPWPDTLOCRSDRCWDWO;;;BA)(A;;RPWP;;;BU)"
sc start "Steam Client Service"

:: clear steam cache at start in background, controlled by ClearSteamCache from CP game settings, only when network share was connected
:: removes ugc and ugcmsgcache plus the recording buffers under gamerecordings video, saved clips are kept
if not defined ClearSteamCache set "ClearSteamCache=1"
if "%STEAM_SAVE_ACTIVE%"=="1" (
	if "%ClearSteamCache%"=="1" start "" /b powershell -NoProfile -Command "Remove-Item -Recurse -Force -ErrorAction SilentlyContinue 'D:\Internet Tools\Steam\userdata\ugc','D:\Internet Tools\Steam\userdata\ugcmsgcache'; Get-ChildItem -Path 'D:\Internet Tools\Steam\userdata\*\gamerecordings\video\*' -Directory -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue"
)

:: steam workshop download from CP game settings - 1 block by setting acf AutoUpdateBehavior to 1, -1 leave acf untouched
if not defined SteamAutoUpdate set "SteamAutoUpdate=-1"
if "%SteamAutoUpdate%"=="-1" goto steam_skip_acf_fix

:: fix steam workshop acf files - fallback if libraryfolders is empty
set "STEAM_APPS_PATH=D:\Internet Tools\Steam\steamapps"
powershell -Command "$acfFiles = Get-ChildItem -Path '%STEAM_APPS_PATH%\*.acf'; foreach ($file in $acfFiles) { $content = Get-Content $file.FullName -Raw; $newContent = $content -replace '\"AutoUpdateBehavior\"\s+\"0\"', '\"AutoUpdateBehavior\"		\"1\"'; Set-Content -Path $file.FullName -Value $newContent; Write-Host 'edited: ' $file.Name }"

:: fix steam workshop acf files based on libraryfolders.vdf
setlocal enabledelayedexpansion
set "STEAM_CONFIG_LIBRARY_FOLDERS=D:\Internet Tools\Steam\config\libraryfolders.vdf"
:: fallback to steamapps\libraryfolders.vdf if config\libraryfolders.vdf is missing
if not exist "%STEAM_CONFIG_LIBRARY_FOLDERS%" set "STEAM_CONFIG_LIBRARY_FOLDERS=D:\Internet Tools\Steam\steamapps\libraryfolders.vdf"
if exist "%STEAM_CONFIG_LIBRARY_FOLDERS%" (
	for /f "usebackq tokens=2 delims==	" %%A in (`findstr /r /c:"\"path\"" "%STEAM_CONFIG_LIBRARY_FOLDERS%"`) do (
		set "steamlibrarypath=%%~A"
		set "steamlibrarypath=!steamlibrarypath:"=!"
		set "steamlibrarypath=!steamlibrarypath:\\=\!"
		echo Processing: !steamlibrarypath!

		if exist "!steamlibrarypath!" (
			echo Exist: !steamlibrarypath!
			set "STEAM_APPS_LIBRARY_PATH=!steamlibrarypath!\steamapps"
			if exist "!STEAM_APPS_LIBRARY_PATH!" (
				powershell -Command "$acfFiles = Get-ChildItem -Path '!STEAM_APPS_LIBRARY_PATH!\*.acf'; foreach ($file in $acfFiles) { $content = Get-Content $file.FullName -Raw; $newContent = $content -replace '\"AutoUpdateBehavior\"\s+\"0\"', '\"AutoUpdateBehavior\"		\"1\"'; Set-Content -Path $file.FullName -Value $newContent; Write-Host 'edited: ' $file.Name }"
			)
		)
	)
)
endlocal
:steam_skip_acf_fix




goto do_mklink_end
:do_mklink
:: do_mklink "source_path" "source_name" "source_copy" "target_path"
set "source_path=%~1"
set "source_name=%~2"
set "source_copy=%~3"
set "target_path=%~4"
:: Already linked into an IDC package's ICafeCloud folder - IDC fixes own this path, leave it alone
2>nul dir /AL "%source_path%" | find /I " %source_name% [" | find /I "\ICafeCloud\" >nul
if %errorlevel% equ 0 exit /b 0
:: if not absolute path
If "%target_path:~1,1%" equ ":" goto mklink_next
If "%target_path:~0,2%" equ "\\" goto mklink_next
set "target_path=%gamedrive%\GameFixes\%target_path%"
:mklink_next
:: Try to create the target path if missing; if still absent (server share not ready), exit immediately
:: to preserve the existing junction — deleting it without being able to recreate risks data loss.
If not exist "%target_path%\" ( 2>nul mkdir "%target_path%\" )
If not exist "%target_path%\" exit /b 0

2>nul dir /AL /B "%source_path%" | find "%source_name%"
If %errorlevel% equ 0 (
	rmdir "%source_path%\%source_name%"
)
2>nul dir /AD /B "%source_path%" | find "%source_name%"
If %errorlevel% equ 0 (
	If %source_copy% equ 1 (
		xcopy "%source_path%\%source_name%\*" "%target_path%\" /y /s /e
	)
	rmdir "%source_path%\%source_name%" /s /q
)

if not exist "%source_path%\%source_name%\" (
	mkdir "%source_path%\%source_name%\"
	rmdir "%source_path%\%source_name%\"
)
mklink /D "%source_path%\%source_name%\" "%target_path%\"
if errorlevel 1 echo [do_mklink FAILED] "%source_path%\%source_name%" -^> "%target_path%" >&2
exit /b 0
:do_mklink_end

goto do_everyone_name_end
:do_everyone_name
:: https://groups.google.com/g/alt.msdos.batch.nt/c/__xbYef0Z_Y
set "everyone_name=Everyone"
for /f "tokens=1* delims= " %%a in ('whoami /groups ^| find "S-1-1-0"') do ( set "everyone_name=%%a" )
:loop_do_everyone_name_end
exit /b 0
:do_everyone_name_end

goto do_gamefix_permission_end
:do_gamefix_permission
:: Skip if Everyone(S-1-1-0) already has access on the root, to avoid costly recursive traversal on every boot
:: Diskless clients have no persistent storage, so a marker file is not an option — query ACL state directly
:: ICACLS outputs the localised display name, not the SID, so resolve the Everyone display name first
call :do_everyone_name
2>nul ICACLS "%gamedrive%\GameFixes" | find "%everyone_name%" >nul
if %errorlevel% equ 0 exit /b 0
ICACLS "%gamedrive%\GameFixes" /grant:r "*S-1-1-0":(OI)(CI)F /inheritance:e /T /Q
exit /b 0
:do_gamefix_permission_end

goto create_desktop_shortcut_end
:create_desktop_shortcut
set "shortcut_name=%~1"
set "shortcut_exe_path=%~2"
set "shortcut_work_path=%~3"

echo On Error Resume Next > "%~dp0CreateShortcut.vbs"
echo Set WshShell = WScript.CreateObject("WScript.Shell") >> "%~dp0CreateShortcut.vbs"
echo strDesktop = WshShell.SpecialFolders("Desktop") >> "%~dp0CreateShortcut.vbs"
echo set oShellLink = WshShell.CreateShortcut(strDesktop ^& "\" ^& "%shortcut_name%" ^& ".lnk") >> "%~dp0CreateShortcut.vbs"
echo oShellLink.TargetPath = "%shortcut_exe_path%" >> "%~dp0CreateShortcut.vbs"
echo oShellLink.Description = "%shortcut_name%" >> "%~dp0CreateShortcut.vbs"
echo oShellLink.WorkingDirectory = "%shortcut_work_path%" >> "%~dp0CreateShortcut.vbs"
echo oShellLink.Save >> "%~dp0CreateShortcut.vbs"

call wscript -e:vbs "%~dp0CreateShortcut.vbs"
exit /b 0
:create_desktop_shortcut_end

goto replace_file_string_end
:replace_file_string
set "file_path=%~1"
set "file_string=%~2"
set "file_replace=%~3"
echo On Error Resume Next > "%~dp0ReplaceFileString.vbs"
echo Dim Fso, textFile, textString >> "%~dp0ReplaceFileString.vbs"
echo Set Fso = CreateObject("Scripting.FileSystemObject") >> "%~dp0ReplaceFileString.vbs"
echo Set textFile = Fso.OpenTextFile("%file_path%", 1) >> "%~dp0ReplaceFileString.vbs"
echo textString = Replace(textFile.ReadAll, "%file_string%", "%file_replace%") >> "%~dp0ReplaceFileString.vbs"
echo textFile.Close >> "%~dp0ReplaceFileString.vbs"
echo Set textFile = Fso.OpenTextFile("%file_path%", 2) >> "%~dp0ReplaceFileString.vbs"
echo textFile.Write textString >> "%~dp0ReplaceFileString.vbs"
echo textFile.Close >> "%~dp0ReplaceFileString.vbs"

call wscript -e:vbs "%~dp0ReplaceFileString.vbs"
exit /b 0
:replace_file_string_end


goto netshare_client_end
:netshare_client
set "server_ip=%~1"
call :fix_win11_24H2
:network_store_interface
REM Network Store Interface Service for client
2>nul sc query | find /i "SERVICE_NAME: nsi"
if %errorlevel% equ 0 (
	goto workstation_service
) else (
	goto start_nsi_service
)

:start_nsi_service
2>nul sc config nsi start= AUTO
2>nul net start nsi

:workstation_service
REM Workstation
2>nul sc query | find /i "SERVICE_NAME: LanmanWorkstation"
if %errorlevel% equ 0 (
	goto netshare_exit
) else (
	goto start_workstation
)

:start_workstation
2>nul sc config LanmanWorkstation start= AUTO
2>nul net start LanmanWorkstation

:netshare_exit
fsutil behavior set SymlinkEvaluation L2R:1
powershell -command "cmdkey /add:%server_ip% /user:$((Get-LocalUser | Where-Object SID -like '*-501').Name)" 
exit /b 0
:netshare_client_end

goto netshare_server_end
:netshare_server
REM Netshare Required Services for server
:: call :netshare_server "source" "target" "permission"
set "netshare_source=%~1"
set "netshare_target=%~2"
set "netshare_permission=%~3"

If not exist "%netshare_source%" ( mkdir "%netshare_source%" )
rem firewall enable
netsh advfirewall firewall delete rule name="CCBootShare"
netsh advfirewall firewall add rule name="CCBootShare" dir=in action=allow protocol=TCP localport=445

call :fix_win11_24H2

:rpc_endpoint_mapper
REM RPC Endpoint Mapper
2>nul sc query | find /i "SERVICE_NAME: RpcEptMapper"
if not errorlevel 1 (goto dcom_server_process_launcher) else goto start_rpc_mapper_service

:start_rpc_mapper_service
2>nul sc config nsi start= AUTO
2>nul net start nsi

:dcom_server_process_launcher
REM DCOM Server Process Launcher
2>nul sc query | find /i "SERVICE_NAME: DcomLaunch"
if not errorlevel 1 (goto remote_procedure_call) else goto start_dcom_service

:start_dcom_service
2>nul sc config DcomLaunch start= AUTO
2>nul net start DcomLaunch

:remote_procedure_call
REM Remote Procedure Call - RPC
2>nul sc query | find /i "SERVICE_NAME: RpcSs" 
if not errorlevel 1 (goto security_accounts_manager) else goto start_rpc_service

:start_rpc_service
2>nul sc config RpcSs start= AUTO
2>nul net start RpcSs

:security_accounts_manager
REM Security Accounts Manager
2>nul sc query | find /i "SERVICE_NAME: SamSs"
if not errorlevel 1 (goto server_service) else goto start_security_service

:start_security_service
2>nul sc config SamSs start= AUTO
2>nul net start SamSs

:server_service
REM Server
2>nul sc query | find /i "SERVICE_NAME: LanmanServer"
if not errorlevel 1 (goto get_sid_guest) else goto start_server_service

:start_server_service
2>nul sc config LanmanServer start= AUTO
2>nul net start LanmanServer

:get_sid_guest
echo get sid guest variable
for /f "delims= " %%a in ('powershell -command "(Get-LocalUser | Where-Object SID -like '*-501').SID.Value"') do (
	set "sid_guest=%%a"
	goto loop_end_guest_sid
)

:loop_end_guest_sid

echo create script for regini
@echo \Registry\Machine\SECURITY [1 5 7 11 17 21]> x
@echo \Registry\Machine\SECURITY\policy [1 5 7 11 17 21]>> x
@echo \Registry\Machine\SECURITY\policy\accounts [1 5 7 11 17 21]>> x
@echo \Registry\Machine\SECURITY\policy\accounts\%sid_guest% [1 5 7 11 17 21]>> x
@echo \Registry\Machine\SECURITY\policy\accounts\%sid_guest%\ActSysAc [1 5 7 11 17 21]>> x

echo add permission for machine/security
powershell -command "Enable-LocalUser -SID (Get-LocalUser | Where-Object SID -like '*-501').SID"
regini x
del x
@echo Windows Registry Editor Version 5.00 > y.reg
@echo [HKEY_LOCAL_MACHINE\SECURITY\Policy\Accounts\%sid_guest%\ActSysAc] >> y.reg
@echo @=hex(0):42,00,00,00 >> y.reg
2>nul reg import y.reg
del y.reg

:: call :do_everyone_name

:: delete share if target is different
for /f "skip=1 tokens=1,2" %%a in ('net share %netshare_target%') do (
	if /i not "%%b"=="%netshare_source%" (
		2>nul net share "%netshare_target%" /delete /y
	)
	goto netshare_server_next
)
:netshare_server_next

net share %netshare_target%
if %errorlevel% neq 0 (
	if exist "%netshare_source%" (
		for /f "tokens=1* delims= " %%a in ('whoami /groups ^| find "S-1-1-0"') do ( net share %netshare_target%="%netshare_source%" /unlimited /y /grant:"%%a",%netshare_permission% )
	)
)
:: ICACLS outputs the localised display name, not the SID, so resolve the Everyone display name first
:: Use a single-line if to avoid the (OI)(CI) flags conflicting with if-block parentheses
call :do_everyone_name
2>nul ICACLS "%netshare_source%" | find "%everyone_name%" >nul
if %errorlevel% neq 0  ICACLS "%netshare_source%" /grant:r "*S-1-1-0":(OI)(CI)F /inheritance:e /T
exit /b 0
:netshare_server_end

goto fix_win11_24H2_end
:fix_win11_24H2
(
echo Windows Registry Editor Version 5.00
echo.
echo [HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Services\LanmanWorkstation\Parameters]
echo "RequireSecuritySignature"=dword:00000000
echo.
echo [HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Windows\LanmanWorkstation]
echo "AllowInsecureGuestAuth"=dword:00000001
echo.
echo [HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\Policies\Microsoft\Windows\LanmanWorkstation]
echo "AllowInsecureGuestAuth"=dword:00000001
) > temp.reg

:: Import the REG file
reg import temp.reg

:: Delete the temporary file
del /q temp.reg
exit /b 0
:fix_win11_24H2_end

