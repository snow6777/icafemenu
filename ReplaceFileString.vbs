On Error Resume Next 
Dim Fso, textFile, textString 
Set Fso = CreateObject("Scripting.FileSystemObject") 
Set textFile = Fso.OpenTextFile("C:\Users\User\AppData\Local\EpicGamesLauncher\Saved\Config\WindowsEditor\GameUserSettings.ini", 1) 
textString = Replace(textFile.ReadAll, "Enable=True", "Enable=False") 
textFile.Close 
Set textFile = Fso.OpenTextFile("C:\Users\User\AppData\Local\EpicGamesLauncher\Saved\Config\WindowsEditor\GameUserSettings.ini", 2) 
textFile.Write textString 
textFile.Close 
