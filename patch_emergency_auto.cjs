const fs = require('fs');
const path = 'e:/rakshanav-main/rakshanav-main/rakshanav/src/pages/citizen/Emergency.jsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes("import { useLocation }")) {
  content = content.replace(
    "import { motion, AnimatePresence } from 'framer-motion';",
    "import { motion, AnimatePresence } from 'framer-motion';\nimport { useLocation } from 'react-router-dom';"
  );
}

if (!content.includes("const location = useLocation();")) {
  content = content.replace(
    "export default function Emergency() {",
    "export default function Emergency() {\n  const location = useLocation();\n"
  );
}

const useEffectHook = `
  useEffect(() => {
    if (location.state?.autoTrigger && !isSosActive && countdown === null) {
      // Clear the state so it doesn't trigger again on re-renders
      window.history.replaceState({}, document.title)
      startSOSCountdown();
    }
  }, [location.state, isSosActive, countdown]);
`;

if (!content.includes("location.state?.autoTrigger")) {
  content = content.replace(
    "const startSOSCountdown = () => {",
    useEffectHook + "\n  const startSOSCountdown = () => {"
  );
}

fs.writeFileSync(path, content, 'utf8');
console.log("Patched Emergency.jsx");
