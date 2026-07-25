import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PasswordGate from './components/PasswordGate';
import Dashboard from './pages/Dashboard';
import Words from './pages/Words';
import WordDetail from './pages/WordDetail';
import AddWord from './pages/AddWord';
import GeneratePrompt from './pages/GeneratePrompt';
import PromptHistory from './pages/PromptHistory';
import PromptDetail from './pages/PromptDetail';
import MasterPromptEditor from './pages/MasterPromptEditor';
import AISettings from './pages/AISettings';

export default function App() {
  return (
    <PasswordGate>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/words" element={<Words />} />
          <Route path="/words/add" element={<AddWord />} />
          <Route path="/words/:id" element={<WordDetail />} />
          <Route path="/generate" element={<GeneratePrompt />} />
          <Route path="/history" element={<PromptHistory />} />
          <Route path="/history/:id" element={<PromptDetail />} />
          <Route path="/templates" element={<MasterPromptEditor />} />
          <Route path="/settings" element={<AISettings />} />
        </Routes>
      </BrowserRouter>
    </PasswordGate>
  );
}
