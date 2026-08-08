const fs = require('fs');
const path = 'e:/rakshanav-main/rakshanav-main/rakshanav/src/pages/citizen/AiAssistant.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Imports
content = content.replace("import { useNavigate } from 'react-router-dom';", "import { useNavigate, matchRoutes } from 'react-router-dom';\nimport { appRoutes } from '../../config/routes';");

// 2. The useEffect for AI action
const useEffectRegex = /  \/\/ Watch for auto-navigation action tags in the AI's final response[\s\S]*?  \}, \[messages, isTyping, navigate\]\);/;
const newUseEffect = `  // Watch for auto-navigation action tags in the AI's final response
  useEffect(() => {
    if (!isTyping && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'ai' && !navigatedMsgIds.current.has(lastMessage.id)) {
        const actionMatch = lastMessage.text.match(/<action\\s+type="navigate"\\s+target="([^"]+)"(?:\\s+origin="([^"]*)")?(?:\\s+destination="([^"]*)")?\\s*\\/>/);
        
        if (actionMatch && actionMatch[1]) {
           let target = actionMatch[1];
           const origin = actionMatch[2];
           const destination = actionMatch[3];

           // Aggressive fallback for common hallucinated routes
           if (target === '/dashboard/navigate' || target === '/navigate' || target.includes('navigate') || target.includes('safe_route') || target.includes('navigation')) {
              target = '/dashboard/navigation';
           }

           if (target === '/dashboard/navigation' && (!origin || !destination)) {
              console.warn('[AI Navigation Guard] Missing origin or destination. Aborting redirect.');
              return;
           }

           // Validate against registered routes
           const isMatch = matchRoutes(appRoutes, target);
           let finalTarget = target;
           if (!isMatch) {
              console.warn(\`[AI Navigation] Invalid route requested: \${target}. Falling back to default dashboard.\`);
              finalTarget = '/dashboard';
           }

           console.log(\`\\n==================================================\`);
           console.log(\`[AI Navigation Logger]\`);
           console.log(\`Intent / Action: navigate\`);
           console.log(\`Requested Route: \${actionMatch[1]}\`);
           console.log(\`Resolved Target: \${finalTarget}\`);
           console.log(\`Status: \${isMatch ? 'Verified by React Router' : 'Substituted due to invalid path'}\`);
           console.log(\`==================================================\\n\`);

           navigatedMsgIds.current.add(lastMessage.id);
           
           setTimeout(() => {
             navigate(finalTarget, { state: { autoTrigger: true, origin, destination } });
           }, 2000);
        }
      }
    }
  }, [messages, isTyping, navigate]);`;

content = content.replace(useEffectRegex, newUseEffect);

// 3. Update hardcoded UI links inside the chat component
content = content.replace(/'\/dashboard\/navigate'/g, "'/dashboard/navigation'");
content = content.replace(/target="\/dashboard\/navigate"/g, 'target="/dashboard/navigation"');

fs.writeFileSync(path, content, 'utf8');
console.log('Patched AiAssistant.jsx');
