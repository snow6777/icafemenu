set ServerIP=127.0.0.1
@chcp 65001 >nul
set "gamedrive=D:"
set "NetShareName=iCafeCloudShare"
set "NetShareSource=C:\iCafeCloudShare"
set "SaveShaders=1"
set "SaveSteamData=1"
set "ICafeHDD=0"
set "GameSave=1"
set "GameSaveLimit=0"

set "member_account=%~1"
if not defined member_account goto end_game_save
if "%GameSave%" neq "1" goto end_game_save
call :netshare_client "%ServerIP%"
:: NET USE "\\%ServerIP%\%NetShareName%" "" /USER:guest /Y
if %errorlevel% neq 0 goto end_game_save
if %GameSaveLimit% equ 0 goto next_game_save

:: get the folder size in MB with powershell, parsing the dir output depends on the system language
@echo off
set "folder_size=0"
set "gamesave_path=\\%ServerIP%\%NetShareName%\users\%member_account%"
for /f %%a in ('powershell -NoProfile -Command "$s = (Get-ChildItem -LiteralPath '%gamesave_path%' -Recurse -File -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum; if ($s) { [math]::Floor($s / 1MB) } else { 0 }"') do set "folder_size=%%a"
@echo on
if %folder_size% GTR %GameSaveLimit% ( rmdir /s /q "%gamesave_path%" )

:next_game_save

echo [GameSave] Darksiders 3 >&2
rem Darksiders 3

rem ==== GameSave for Darksiders 3 ====
call :do_mklink "C:\Users\%USERNAME%\AppData\Local\Darksiders3\Saved\Config" "WindowsNoEditor" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\5\C#\Users\%%%%USERNAME%%%%\AppData\Local\Darksiders3\Saved\Config\WindowsNoEditor"

echo [GameSave] Battlefield 1 >&2
rem Battlefield 1

rem ==== GameSave for Battlefield 1 ====
call :do_mklink "C:\users\%USERNAME%\Documents\Battlefield 1\settings  Originally from: http:\\www.savegameworld.com" "pc-battlefield-1-savegame" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\6\C#\users\%%%%USERNAME%%%%\Documents\Battlefield 1\settings  Originally from# http#\\www.savegameworld.com\pc-battlefield-1-savegame"

echo [GameSave] Horizon - Zero Down >&2
rem Horizon - Zero Down

rem ==== GameSave for Horizon - Zero Down ====
call :do_mklink "C:\users\%USERNAME%\Documents\Horizon Zero Dawn" "Saved Game" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\11\C#\users\%%%%USERNAME%%%%\Documents\Horizon Zero Dawn\Saved Game"

echo [GameSave] Assassin's Creed Unity >&2
rem Assassin's Creed Unity

rem ==== GameSave for Assassin's Creed Unity ====
call :do_mklink "C:\ProgramData\Orbit" "720" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\16\C#\ProgramData\Orbit\720"

echo [GameSave] Visage >&2
rem Visage

rem ==== GameSave for Visage ====
call :do_mklink "C:\Users\%username%\AppData\Local\Visage\Saved" "SaveGames" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\19\C#\Users\%%%%username%%%%\AppData\Local\Visage\Saved\SaveGames"

echo [GameSave] Car Mechanic Simulator 2015 >&2
rem Car Mechanic Simulator 2015

rem ==== GameSave for Car Mechanic Simulator 2015 ====
call :do_mklink "C:\Users\%USERNAME%\AppData\LocalLow\Red Dot Games" "Car Mechanic Simulator 2015" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\20\C#\Users\%%%%USERNAME%%%%\AppData\LocalLow\Red Dot Games\Car Mechanic Simulator 2015"

echo [GameSave] Batman.Arkham.Knight >&2
rem Batman.Arkham.Knight

rem ==== GameSave for Batman.Arkham.Knight ====
call :do_mklink "C:\Users\%username%\Documents\WB Games" "Batman Arkham Knight" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\21\C#\Users\%%%%username%%%%\Documents\WB Games\Batman Arkham Knight"

echo [GameSave] Little Nightmares II >&2
rem Little Nightmares II

rem ==== GameSave for Little Nightmares II ====
call :do_mklink "C:\Users\%username%\AppData\Local\Helios\Saved" "SaveGames" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\22\C#\Users\%%%%username%%%%\AppData\Local\Helios\Saved\SaveGames"

echo [GameSave] Red Dead Redemption 2 >&2
rem Red Dead Redemption 2

rem ==== GameSave for Red Dead Redemption 2 ====
call :do_mklink "C:\Users\%username%\AppData\Roaming\Goldberg SocialClub Emu Saves" "RDR2" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\54\C#\Users\%%%%username%%%%\AppData\Roaming\Goldberg SocialClub Emu Saves\RDR2"

echo [GameSave] The Witcher 3 >&2
rem The Witcher 3

rem ==== GameSave for The Witcher 3 ====
call :do_mklink "%USERNAME%\Documents" "The Witcher 3" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\56\%%%%USERNAME%%%%\Documents\The Witcher 3"

echo [GameSave] Just Cause 4 >&2
rem Just Cause 4

rem ==== GameSave for Just Cause 4 ====
call :do_mklink "C:\Users\%username%\Documents\Square Enix\Just Cause 4" "LocalData" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\60\C#\Users\%%%%username%%%%\Documents\Square Enix\Just Cause 4\LocalData"

echo [GameSave] Cyberpunk 2077 >&2
rem Cyberpunk 2077

rem ==== GameSave for Cyberpunk 2077 ====
call :do_mklink "C:\Users\%USERNAME%\Saved Games\CD Projekt Red" "Cyberpunk 2077" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\61\C#\Users\%%%%USERNAME%%%%\Saved Games\CD Projekt Red\Cyberpunk 2077"

echo [GameSave] Far Cry Primal >&2
rem Far Cry Primal

rem ==== GameSave for Far Cry Primal ====
call :do_mklink "C:\Users\%username%\Documents\CPY_SAVES\CPY\UPLAY" "2010" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\65\C#\Users\%%%%username%%%%\Documents\CPY_SAVES\CPY\UPLAY\2010"

echo [GameSave] ELDEN RING >&2
rem ELDEN RING

rem ==== GameSave for ELDEN RING ====
call :do_mklink "C:\Users\%USERNAME%\AppData\Roaming\EldenRing" "76561200001240838" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\71\C#\Users\%%%%USERNAME%%%%\AppData\Roaming\EldenRing\76561200001240838"

echo [GameSave] Outlast >&2
rem Outlast

rem ==== GameSave for Outlast ====
call :do_mklink "C:\Users\%username%\Documents\My Games\Outlast\OLGame" "SaveData" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\84\C#\Users\%%%%username%%%%\Documents\My Games\Outlast\OLGame\SaveData"

echo [GameSave] Detroit - Become Human >&2
rem Detroit - Become Human

rem ==== GameSave for Detroit - Become Human ====
call :do_mklink "C:\Users\%username%\Saved Games\Quantic Dream" "Detroit Become Human" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\89\C#\Users\%%%%username%%%%\Saved Games\Quantic Dream\Detroit Become Human"

echo [GameSave] Stray >&2
rem Stray

rem ==== GameSave for Stray ====
call :do_mklink "C:\Users\%username%\AppData\Local\Hk_project\Saved" "SaveGames" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\91\C#\Users\%%%%username%%%%\AppData\Local\Hk_project\Saved\SaveGames"

echo [GameSave] Little Nightmares >&2
rem Little Nightmares

rem ==== GameSave for Little Nightmares ====
call :do_mklink "C:\Users\%username%\AppData\Roaming" "Goldberg UplayEmu Saves" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\96\C#\Users\%%%%username%%%%\AppData\Roaming\Goldberg UplayEmu Saves"

echo [GameSave] DAYS GONE >&2
rem DAYS GONE

rem ==== GameSave for DAYS GONE ====
call :do_mklink "C:\Users\BAZOOKA\AppData\Local\BendGame\Saved" "76561200044689229" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\99\C#\Users\BAZOOKA\AppData\Local\BendGame\Saved\76561200044689229"

echo [GameSave] Cuphead >&2
rem Cuphead

rem ==== GameSave for Cuphead ====
call :do_mklink "C:\users\%USERNAME%\AppData\Roaming" "Cuphead" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\103\C#\users\%%%%USERNAME%%%%\AppData\Roaming\Cuphead"

echo [GameSave] The-Lord-of-the-Rings >&2
rem The-Lord-of-the-Rings

rem ==== GameSave for The-Lord-of-the-Rings ====
call :do_mklink "C:\Users\%USERNAME%\Documents" "LOTR The Return of the King (tm) Data" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\108\C#\Users\%%%%USERNAME%%%%\Documents\LOTR The Return of the King (tm) Data"

echo [GameSave] Marvels SpiderMan Miles Morales >&2
rem Marvels SpiderMan Miles Morales

rem ==== GameSave for Marvels SpiderMan Miles Morales ====
call :do_mklink "C:\Users\%USERNAME%\Documents\Marvel's Spider-Man Miles Morales" "76561197960267366" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\110\C#\Users\%%%%USERNAME%%%%\Documents\Marvel's Spider-Man Miles Morales\76561197960267366"

echo [GameSave] UNCHARTED - Legacy of Thieves Collection >&2
rem UNCHARTED - Legacy of Thieves Collection

rem ==== GameSave for UNCHARTED - Legacy of Thieves Collection ====
call :do_mklink "C:\Users\BAZOOKA\Saved Games\Uncharted Legacy of Thieves Collection\users\216074169" "Uncharted4" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\111\C#\Users\BAZOOKA\Saved Games\Uncharted Legacy of Thieves Collection\users\216074169\Uncharted4"

echo [GameSave] Dark Souls III >&2
rem Dark Souls III

rem ==== GameSave for Dark Souls III ====
call :do_mklink "C:\Users\%username%\appdata\Roaming\DarkSoulsIII" "0110000100000666" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\117\C#\Users\%%%%username%%%%\appdata\Roaming\DarkSoulsIII\0110000100000666"

echo [GameSave] High on Life >&2
rem High on Life

rem ==== GameSave for High on Life ====
call :do_mklink "C:\Users\%USERNAME%\AppData\Local\Oregon" "Saved" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\122\C#\Users\%%%%USERNAME%%%%\AppData\Local\Oregon\Saved"

echo [GameSave] Evil West >&2
rem Evil West

rem ==== GameSave for Evil West ====
call :do_mklink "C:\Users%username%\AppData\Local\HighMoon\Saved" "SaveGames" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\128\C#\Users%%%%username%%%%\AppData\Local\HighMoon\Saved\SaveGames"

echo [GameSave] Resident Evil 2 >&2
rem Resident Evil 2

rem ==== GameSave for Resident Evil 2 ====
call :do_mklink "C:\Users\Public\Documents\Steam\CODEX\883710\remote" "win64_save" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\143\C#\Users\Public\Documents\Steam\CODEX\883710\remote\win64_save"

echo [GameSave] Spider-man Remastered >&2
rem Spider-man Remastered

rem ==== GameSave for Spider-man Remastered ====
call :do_mklink "C:\Users\BAZOOKA\Documents\Marvel's Spider-Man Remastered" "76561200044689229" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\147\C#\Users\BAZOOKA\Documents\Marvel's Spider-Man Remastered\76561200044689229"

echo [GameSave] Resident Evil 4 Remake >&2
rem Resident Evil 4 Remake

rem ==== GameSave for Resident Evil 4 Remake ====
call :do_mklink "C:\Users\Public\Documents\EMPRESS\2050650\remote\2050650" "remote" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\148\C#\Users\Public\Documents\EMPRESS\2050650\remote\2050650\remote"

echo [GameSave] Resident Evil - Village >&2
rem Resident Evil - Village

rem ==== GameSave for Resident Evil - Village ====
call :do_mklink "C:\Users\Public\Documents\Steam\RUNE\1196590\remote" "win64_save" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\149\C#\Users\Public\Documents\Steam\RUNE\1196590\remote\win64_save"

echo [GameSave] God of War >&2
rem God of War

rem ==== GameSave for God of War ====
call :do_mklink "C:\Users\%USERNAME%\Saved Games\God of War" "6300451" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\152\C#\Users\%%%%USERNAME%%%%\Saved Games\God of War\6300451"

echo [GameSave] Assassin's Creed - Odyssey >&2
rem Assassin's Creed - Odyssey

rem ==== GameSave for Assassin's Creed - Odyssey ====
call :do_mklink "C:\Users\%username%\Documents" "Odyssey" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\160\C#\Users\%%%%username%%%%\Documents\Odyssey"

echo [GameSave] Assassin's Creed Brotherhood >&2
rem Assassin's Creed Brotherhood

rem ==== GameSave for Assassin's Creed Brotherhood ====
call :do_mklink "C:\Users\%UserName%\Saved Games\Assassin’s Creed Brotherhood" "SAVES" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\170\C#\Users\%%%%UserName%%%%\Saved Games\Assassin’s Creed Brotherhood\SAVES"

echo [GameSave] The Last of Us Part I >&2
rem The Last of Us Part I

rem ==== GameSave for The Last of Us Part I ====
call :do_mklink "C:\Users\%USERNAME%\Saved Games\The Last of Us Part I\users" "216074169" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\186\C#\Users\%%%%USERNAME%%%%\Saved Games\The Last of Us Part I\users\216074169"

echo [GameSave] Hitman 3 >&2
rem Hitman 3

rem ==== GameSave for Hitman 3 ====
call :do_mklink "C:\%UserProfile%\AppData\Roaming\IO Interactive\Epic\USER-ID" "HITMAN3" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\188\C#\%%%%UserProfile%%%%\AppData\Roaming\IO Interactive\Epic\USER-ID\HITMAN3"

echo [GameSave] Mafia - Definitive Edition >&2
rem Mafia - Definitive Edition

rem ==== GameSave for Mafia - Definitive Edition ====
call :do_mklink "C:\Users\%username%\Documents\My Games\Mafia Definitive Edition\Data\76561197960267366" "gamesaves" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\189\C#\Users\%%%%username%%%%\Documents\My Games\Mafia Definitive Edition\Data\76561197960267366\gamesaves"

echo [GameSave] GTA Liberty City Stories >&2
rem GTA Liberty City Stories

rem ==== GameSave for GTA Liberty City Stories ====
call :do_mklink "C:\Users\%username%\Documents" "GTA Liberty City Stories User Files" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\198\C#\Users\%%%%username%%%%\Documents\GTA Liberty City Stories User Files"

echo [GameSave] Palworld >&2
rem Palworld

rem ==== GameSave for Palworld ====
call :do_mklink "C:\Users\%username%\AppData\Local\Pal\Saved" "SaveGames" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\213\C#\Users\%%%%username%%%%\AppData\Local\Pal\Saved\SaveGames"

echo [GameSave] A Way Out >&2
rem A Way Out

rem ==== GameSave for A Way Out ====
call :do_mklink "C:\Users\%username%\Documents\My Games\A Way Out" "Saves" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\217\C#\Users\%%%%username%%%%\Documents\My Games\A Way Out\Saves"

echo [GameSave] SIFU >&2
rem SIFU

rem ==== GameSave for SIFU ====
call :do_mklink "C:\Users\%UserName%\AppData\Local\Sifu\Saved" "SaveGames" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\218\C#\Users\%%%%UserName%%%%\AppData\Local\Sifu\Saved\SaveGames"

echo [GameSave] Risk of Rain 2 >&2
rem Risk of Rain 2

rem ==== GameSave for Risk of Rain 2 ====
call :do_mklink "C:\Users\%username%\AppData\Local\Perplexity\Comet\User Data\Default\IndexedDB" "https_riskofrain2-save-editor.web.app_0.indexeddb.leveldb" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\225\C#\Users\%%%%username%%%%\AppData\Local\Perplexity\Comet\User Data\Default\IndexedDB\https_riskofrain2-save-editor.web.app_0.indexeddb.leveldb"

echo [GameSave] Assassin's Creed - Origins >&2
rem Assassin's Creed - Origins

rem ==== GameSave for Assassin's Creed - Origins ====
call :do_mklink "C:\Users\%username%\Documents" "Origins" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\237\C#\Users\%%%%username%%%%\Documents\Origins"

echo [GameSave] Subnautica >&2
rem Subnautica

rem ==== GameSave for Subnautica ====
call :do_mklink "C:\Users\%USERNAME%\AppData\LocalLow\Unknown Worlds\Subnautica\Subnautica" "SavedGames" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\245\C#\Users\%%%%USERNAME%%%%\AppData\LocalLow\Unknown Worlds\Subnautica\Subnautica\SavedGames"

echo [GameSave] Ghost of Tsushima >&2
rem Ghost of Tsushima

rem ==== GameSave for Ghost of Tsushima ====
call :do_mklink "C:\Users\%USERNAME%\Documents\Ghost of Tsushima DIRECTOR'S CUT" "76561197960271872" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\249\C#\Users\%%%%USERNAME%%%%\Documents\Ghost of Tsushima DIRECTOR'S CUT\76561197960271872"

echo [GameSave] Assassin Creed Mirage >&2
rem Assassin Creed Mirage

rem ==== GameSave for Assassin Creed Mirage ====
call :do_mklink "C:\Users\%username%\Documents\Assassin's Creed Mirage" "saves" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\264\C#\Users\%%%%username%%%%\Documents\Assassin's Creed Mirage\saves"

echo [GameSave] Marvels SpiderMan 2 >&2
rem Marvels SpiderMan 2

rem ==== GameSave for Marvels SpiderMan 2 ====
call :do_mklink "C:\Users\%USERNAME%\Documents" "Marvel's Spider-Man 2" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\267\C#\Users\%%%%USERNAME%%%%\Documents\Marvel's Spider-Man 2"

echo [GameSave] nightreign >&2
rem nightreign

rem ==== GameSave for nightreign ====
call :do_mklink "C:\Users\%USERNAME%\AppData\Roaming\Nightreign" "76561197960271872" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\281\C#\Users\%%%%USERNAME%%%%\AppData\Roaming\Nightreign\76561197960271872"

echo [GameSave] The Last of Us Part II Remastered >&2
rem The Last of Us Part II Remastered

rem ==== GameSave for The Last of Us Part II Remastered ====
call :do_mklink "C:\Users\%USERNAME%\Documents" "The Last of Us Part II" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\282\C#\Users\%%%%USERNAME%%%%\Documents\The Last of Us Part II"

echo [GameSave] Split Fiction >&2
rem Split Fiction

rem ==== GameSave for Split Fiction ====
call :do_mklink "C:\Users\%USERNAME%\AppData\Local" "SplitFiction" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\284\C#\Users\%%%%USERNAME%%%%\AppData\Local\SplitFiction"

echo [GameSave] Hollow Knight Silksong >&2
rem Hollow Knight Silksong

rem ==== GameSave for Hollow Knight Silksong ====
call :do_mklink "%USERPROFILE%\AppData\LocalLow\Team Cherry" "Hollow Knight Silksong" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\293\%%%%USERPROFILE%%%%\AppData\LocalLow\Team Cherry\Hollow Knight Silksong"

echo [GameSave] Assassins Creed IV Black Flag >&2
rem Assassins Creed IV Black Flag

rem ==== GameSave for Assassins Creed IV Black Flag ====
call :do_mklink "F:\Assassins Creed IV Black Flag" "save3dmgames" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\295\F#\Assassins Creed IV Black Flag\save3dmgames"

echo [GameSave] Little Nightmares III >&2
rem Little Nightmares III

rem ==== GameSave for Little Nightmares III ====
call :do_mklink "C:\Users\%username%\AppData\Local\LittleNightmaresIII\Saved" "SaveGames" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\297\C#\Users\%%%%username%%%%\AppData\Local\LittleNightmaresIII\Saved\SaveGames"

echo [GameSave] Expedition33 >&2
rem Expedition33

rem ==== GameSave for Expedition33 ====
call :do_mklink "C:\Users\%username%\AppData\Local\Sandfall\Saved\SaveGames" "76561197960271872" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\299\C#\Users\%%%%username%%%%\AppData\Local\Sandfall\Saved\SaveGames\76561197960271872"

echo [GameSave] Assassin's Creed Rogue >&2
rem Assassin's Creed Rogue

rem ==== GameSave for Assassin's Creed Rogue ====
call :do_mklink "C:\Users\%UserName%\AppData\Roaming\uplay\CODEX\Saves" "AssassinsCreedRogue" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\304\C#\Users\%%%%UserName%%%%\AppData\Roaming\uplay\CODEX\Saves\AssassinsCreedRogue"

echo [GameSave] Dying Light - The Beast >&2
rem Dying Light - The Beast

rem ==== GameSave for Dying Light - The Beast ====
call :do_mklink "F:\savegame\Dying Light - The Beast\ph_ft\work\bin\x64\SteamData\out" "save" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\305\F#\savegame\Dying Light - The Beast\ph_ft\work\bin\x64\SteamData\out\save"

echo [GameSave] Resident Evil Requiem >&2
rem Resident Evil Requiem

rem ==== GameSave for Resident Evil Requiem ====
call :do_mklink "C:\Users\%username%\AppData\Roaming\GSE Saves\3764200\remote" "win64_save" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\315\C#\Users\%%%%username%%%%\AppData\Roaming\GSE Saves\3764200\remote\win64_save"

echo [GameSave] Resident Evil 7 Biohazard >&2
rem Resident Evil 7 Biohazard

rem ==== GameSave for Resident Evil 7 Biohazard ====
call :do_mklink "C:\Users\Public\Documents\Steam\CODEX\418370\remote" "win64_save" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\316\C#\Users\Public\Documents\Steam\CODEX\418370\remote\win64_save"

echo [GameSave] Black Myth - Wukong >&2
rem Black Myth - Wukong

rem ==== GameSave for Black Myth - Wukong ====
call :do_mklink "E:\Ofline\Black Myth - Wukong\b1\Saved\SaveGames" "76561197960285355" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\317\E#\Ofline\Black Myth - Wukong\b1\Saved\SaveGames\76561197960285355"

echo [GameSave] PRAGMATA >&2
rem PRAGMATA

rem ==== GameSave for PRAGMATA ====
call :do_mklink "C:\Users\%username%\AppData\Roaming\GSE Saves" "3357650" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\319\C#\Users\%%%%username%%%%\AppData\Roaming\GSE Saves\3357650"

echo [GameSave] 007 First Light >&2
rem 007 First Light

rem ==== GameSave for 007 First Light ====
call :do_mklink "C:\Users\%username%\AppData\Roaming\GSE Saves" "3768760" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\325\C#\Users\%%%%username%%%%\AppData\Roaming\GSE Saves\3768760"

echo [GameSave] Mortal Kombat 11 >&2
rem Mortal Kombat 11

rem ==== GameSave for Mortal Kombat 11 ====
call :do_mklink "C:\Users\Public\Documents\Steam\CODEX\976310" "remote" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\338\C#\Users\Public\Documents\Steam\CODEX\976310\remote"

echo [GameSave] Mortal Shell 2 >&2
rem Mortal Shell 2

rem ==== GameSave for Mortal Shell 2 ====
call :do_mklink "C:\Users\%username%\AppData\Local\MortalShell2\Saved" "SaveGames" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\339\C#\Users\%%%%username%%%%\AppData\Local\MortalShell2\Saved\SaveGames"

echo [GameSave] DOOM - The Dark Ages >&2
rem DOOM - The Dark Ages

rem ==== GameSave for DOOM - The Dark Ages ====
call :do_mklink "C:\Users%USERNAME%\Saved Games\id Software\DOOMTheDarkAges\base\savegame\76561197960271872" "PROFILE" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\340\C#\Users%%%%USERNAME%%%%\Saved Games\id Software\DOOMTheDarkAges\base\savegame\76561197960271872\PROFILE"

echo [GameSave] Assassin Creed Black Flag Resynced >&2
rem Assassin Creed Black Flag Resynced

rem ==== GameSave for Assassin Creed Black Flag Resynced ====
call :do_mklink "C:\Users\%username%\Documents\Assassin's Creed Black Flag Resynced\cache" "DX12" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\341\C#\Users\%%%%username%%%%\Documents\Assassin's Creed Black Flag Resynced\cache\DX12"

echo [GameSave] New Red Dead Redemption 2 >&2
rem New Red Dead Redemption 2

rem ==== GameSave for New Red Dead Redemption 2 ====
call :do_mklink "C:\Users\%username%\AppData\Roaming\Goldberg SocialClub Emu Saves" "RDR2" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\363\C#\Users\%%%%username%%%%\AppData\Roaming\Goldberg SocialClub Emu Saves\RDR2"

echo [GameSave] Ghost of Tsushima 2 >&2
rem Ghost of Tsushima 2

rem ==== GameSave for Ghost of Tsushima 2 ====
call :do_mklink "C:\Users\%USERNAME%\Documents\Ghost of Tsushima DIRECTOR'S CUT" "76561197960271872" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\364\C#\Users\%%%%USERNAME%%%%\Documents\Ghost of Tsushima DIRECTOR'S CUT\76561197960271872"

echo [GameSave] Need for Speed Most Wanted >&2
rem Need for Speed Most Wanted

rem ==== GameSave for Need for Speed Most Wanted ====
call :do_mklink "%USERPROFILE%\Documents" "NFS Most Wanted" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\20372\%%%%USERPROFILE%%%%\Documents\NFS Most Wanted"

echo [GameSave] Watch Dogs 2 >&2
rem Watch Dogs 2

rem ==== GameSave for Watch Dogs 2 ====
call :do_mklink "C:\Users\%username%\Documents\CPY_SAVES\Player\UPLAY" "2688" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\20642\C#\Users\%%%%username%%%%\Documents\CPY_SAVES\Player\UPLAY\2688"

echo [GameSave] Grand Theft Auto V Steam >&2
rem Grand Theft Auto V Steam

rem ==== GameSave for Grand Theft Auto V Steam ====
call :do_mklink "C:\ProgramData\Socialclub\Player" "271590" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\20670\C#\ProgramData\Socialclub\Player\271590"

echo [GameSave] Outlast 2 >&2
rem Outlast 2

rem ==== GameSave for Outlast 2 ====
call :do_mklink "%USERPROFILE%\Documents\My Games\Outlast2\OLGame" "SaveData" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\21880\%%%%USERPROFILE%%%%\Documents\My Games\Outlast2\OLGame\SaveData"

echo [GameSave] Sekiro Shadows Die Twice >&2
rem Sekiro Shadows Die Twice

rem ==== GameSave for Sekiro Shadows Die Twice ====
call :do_mklink "%APPDATA%" "Sekiro" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\22119\%%%%APPDATA%%%%\Sekiro"

echo [GameSave] Need For Speed Heat >&2
rem Need For Speed Heat

rem ==== GameSave for Need For Speed Heat ====
call :do_mklink "C:\Users\%USERNAME%\Documents\Need for Speed Heat\SaveGame" "savegame" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\22121\C#\Users\%%%%USERNAME%%%%\Documents\Need for Speed Heat\SaveGame\savegame"

echo [GameSave] GTAV - Epic >&2
rem GTAV - Epic

rem ==== GameSave for GTAV - Epic ====
call :do_mklink "C:\ProgramData\Socialclub\Player" "271590" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\22150\C#\ProgramData\Socialclub\Player\271590"

echo [GameSave] Schedule 1 >&2
rem Schedule 1

rem ==== GameSave for Schedule 1 ====
call :do_mklink "%APPDATA%\LocalLow\TVGS\Schedule 1" "Saves" 0 "\\%ServerIP%\iCafeCloudShare\users\%member_account%\22764\%%%%APPDATA%%%%\LocalLow\TVGS\Schedule 1\Saves"


:end_game_save

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

