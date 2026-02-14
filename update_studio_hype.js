const fs = require('fs');
const path = 'd:/Workspace/Gits/CamHub/ams/AntFlow/client/src/views/user/LiveStudio.vue';
let content = fs.readFileSync(path, 'utf8');

// 1. Add handleCelebration method
const celebrationMethod = `
const handleCelebration = () => {
    toast.success('HYPE BURST! 🚀🔥', { duration: 5000 });
    // Trigger gesture for ALL active AI guests
    const activeIds = syntheticGuestManager.getGuests().map(g => g.persona.id);
    activeIds.forEach(id => {
        handleManualGesture({ id, gesture: 'wave' });
    });
    // Spawn extra likes for visual hype
    for(let i=0; i<15; i++) {
        setTimeout(() => spawnLike(), i * 100);
    }
};
`;

if (!content.includes('const handleCelebration =')) {
    content = content.replace(
        /const handleHighlight = \(payload: any\) => \{/,
        `${celebrationMethod}\nconst handleHighlight = (payload: any) => {`
    );
}

// 2. Add to studioDirector action switch
content = content.replace(
    /else if \(action === 'capture_highlight'\) \{[\s\n]+handleHighlight\(payload\);[\s\n]+\}/,
    `else if (action === 'capture_highlight') {
               handleHighlight(payload);
            } else if (action === 'trigger_celebration') {
               handleCelebration();
            }`
);

fs.writeFileSync(path, content);
console.log('Successfully updated LiveStudio.vue for Hype Director');
