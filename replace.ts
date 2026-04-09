import * as fs from 'fs';

const content = fs.readFileSync('src/App.tsx', 'utf8');

const startIndex = content.indexOf('{isAdmin && (\n              <div className={cn("flex-1 pb-32 md:pb-12", activeTab === \'more\' ? \'block\' : \'hidden\')}>\n                <div className="max-w-5xl mx-auto px-4">');
const endIndex = content.indexOf('  )}\n</div>\n</main>');

if (startIndex !== -1 && endIndex !== -1) {
  const newContent = content.substring(0, startIndex) + `{isAdmin && (
              <div className={cn("flex-1 pb-32 md:pb-12", activeTab === 'more' ? 'block' : 'hidden')}>
                <SettingsView 
                  user={user}
                  settingsTab={settingsTab}
                  setSettingsTab={setSettingsTab}
                  isDarkMode={isDarkMode}
                  toggleDarkMode={toggleDarkMode}
                  isInstallable={isInstallable}
                  handleInstallClick={handleInstallClick}
                  setIsAddToHomeModalOpen={setIsAddToHomeModalOpen}
                  businesses={businesses}
                  activeBusiness={activeBusiness}
                  setBusinesses={setBusinesses}
                  setActiveBusiness={setActiveBusiness}
                  aiSettings={aiSettings}
                  handleAiSettingChange={handleAiSettingChange}
                  setAiSettingsState={setAiSettingsState}
                  setAiSettings={setAiSettings}
                  analyticsSettings={analyticsSettings}
                  handleAnalyticsSettingChange={handleAnalyticsSettingChange}
                  setIsExportModalOpen={setIsExportModalOpen}
                  exportScheduleJson={exportScheduleJson}
                  importScheduleJson={importScheduleJson}
                  importScheduleExcel={importScheduleExcel}
                  initialPosts={initialPosts}
                  handleSavePost={handleSavePost}
                  setIsSyncing={setIsSyncing}
                  addSyncLog={addSyncLog}
                  setIsExcelImportModalOpen={setIsExcelImportModalOpen}
                  exportProductExcel={exportProductExcel}
                  handleAutoCategorizeAll={handleAutoCategorizeAll}
                  isAutoCategorizing={isAutoCategorizing}
                  exportProductJson={exportProductJson}
                  importProductJson={importProductJson}
                  googleTokens={googleTokens}
                  handleDisconnectGoogleDrive={handleDisconnectGoogleDrive}
                  handleConnectGoogleDrive={handleConnectGoogleDrive}
                  setConfirmAction={setConfirmAction}
                  syncLogs={syncLogs}
                  signOut={signOut}
                  auth={auth}
                  db={db}
                  setPosts={setPosts}
                  query={query}
                  collection={collection}
                  where={where}
                  getDocs={getDocs}
                  writeBatch={writeBatch}
                />
              </div>
            )}\n` + content.substring(endIndex);
  fs.writeFileSync('src/App.tsx', newContent);
  console.log('Replaced successfully');
} else {
  console.log('Markers not found', startIndex, endIndex);
}
