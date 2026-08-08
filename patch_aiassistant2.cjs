const fs = require('fs');
const path = 'e:/rakshanav-main/rakshanav-main/rakshanav/src/pages/citizen/AiAssistant.jsx';
let c = fs.readFileSync(path, 'utf8');

const newSetup = `export default function AiAssistant() {
  const { messages, isTyping, sendMessage, stopGeneration } = useGeminiChat();
  const [input, setInput] = useState('');
  const endOfMessagesRef = useRef(null);
  const navigatedMsgIds = useRef(new Set());
  const navigate = useNavigate();

  // Watch for auto-navigation action tags in the AI's final response
  useEffect(() => {
    if (!isTyping && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'ai' && !navigatedMsgIds.current.has(lastMessage.id)) {
        // Look for: <action type="navigate" target="/dashboard/navigate" origin="..." destination="..." />
        const actionMatch = lastMessage.text.match(/<action\\s+type="navigate"\\s+target="([^"]+)"(?:\\s+origin="([^"]*)")?(?:\\s+destination="([^"]*)")?\\s*\\/>/);
        
        if (actionMatch && actionMatch[1]) {
           const target = actionMatch[1];
           const origin = actionMatch[2];
           const destination = actionMatch[3];
           
           // If it's a navigation target but missing origin/destination, do NOT route (safety guard)
           if (target === '/dashboard/navigate' && (!origin || !destination)) {
              console.warn('[AI Navigation Guard] Missing origin or destination. Aborting redirect.');
              return;
           }

           // Mark as navigated to prevent infinite loops
           navigatedMsgIds.current.add(lastMessage.id);
           
           // Delay slightly so user can read the text before being swooped away
           setTimeout(() => {
             navigate(target, { state: { autoTrigger: true, origin, destination } });
           }, 2000);
        }
      }
    }
  }, [messages, isTyping, navigate]);`;

c = c.replace(/export default function AiAssistant\(\) \{[\s\S]*?\}, \[messages, isTyping, navigate\]\);/m, newSetup);

fs.writeFileSync(path, c, 'utf8');
console.log('Patched AiAssistant.jsx');
