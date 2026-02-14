const fs = require('fs');
const path = 'd:/Workspace/Gits/CamHub/ams/AntFlow/client/src/views/user/LiveStudio.vue';
let content = fs.readFileSync(path, 'utf8');

// 1. Update handleTalkGuest to process actions
content = content.replace(
    /conversationOrchestrator\.recordInteraction\(name, res\.text\);[\s\n]+toast\.info\(`\$\{name\} is responding\.\.\.`\);/,
    `conversationOrchestrator.recordInteraction(name, res.text);
      if (res.action && res.action !== 'none') {
         studioDirector.requestAction(res.action, res.actionPayload);
         toast.success(\`\${name} requested: \${res.action}\`);
      }
      toast.info(\`\${name} is responding...\`);`
);

// 2. Add producer:action listener in onMounted
if (!content.includes("window.addEventListener('producer:action'")) {
    const listenerCode = `
   // Handle AI Producer Actions
   window.addEventListener('producer:action', (e) => {
      const { type, payload } = e.detail;
      if (type === 'switch_scene' && payload.actionPayload) {
         studioStore.switchScene(payload.actionPayload);
         toast.success(\`Producer Auto-Switch: \${payload.actionPayload}\`);
      } else if (type === 'start_poll') {
          startPoll(null);
      } else if (type === 'trigger_product') {
          studioStore.showcaseProduct({ id: payload.actionPayload });
      }
   });
`;
    content = content.replace(
        /window\.addEventListener\('keydown', handleKeyPress\);/,
        `window.addEventListener('keydown', handleKeyPress);${listenerCode}`
    );
}

fs.writeFileSync(path, content);
console.log('Successfully updated LiveStudio.vue for Proactive Actions');
