import React, { createContext, useContext, useReducer } from 'react';
import { toggleTopicSelection } from '../../constants/topics';

// Drafts for the wizard. Nothing is saved until the finish step.
interface OnboardingState {
  selectedTopics: string[];
  apiKey: string;
  limitHit: boolean; // the user tried to pick more than the topic limit
}

export interface OnboardingInitial {
  topics: string[];
  apiKey: string;
}

type Action =
  | { type: 'toggleTopic'; id: string }
  | { type: 'setApiKey'; apiKey: string };

function reducer(state: OnboardingState, action: Action): OnboardingState {
  switch (action.type) {
    case 'toggleTopic': {
      const { selected, limitHit } = toggleTopicSelection(state.selectedTopics, action.id);
      return { ...state, selectedTopics: selected, limitHit };
    }
    case 'setApiKey':
      return { ...state, apiKey: action.apiKey };
  }
}

interface OnboardingValue extends OnboardingState {
  toggleTopic: (id: string) => void;
  setApiKey: (apiKey: string) => void;
}

const OnboardingContext = createContext<OnboardingValue | null>(null);

export const OnboardingProvider: React.FC<{ initial: OnboardingInitial; children: React.ReactNode }> = ({
  initial,
  children,
}) => {
  const [state, dispatch] = useReducer(reducer, {
    selectedTopics: initial.topics,
    apiKey: initial.apiKey,
    limitHit: false,
  });
  const value: OnboardingValue = {
    ...state,
    toggleTopic: id => dispatch({ type: 'toggleTopic', id }),
    setApiKey: apiKey => dispatch({ type: 'setApiKey', apiKey }),
  };
  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
};

export function useOnboarding(): OnboardingValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used inside OnboardingProvider');
  return ctx;
}

// Provided by the root layout, which owns whether the wizard or the feed is showing.
interface Gate {
  finish: (topics: string[], apiKey: string) => Promise<void>; // saves the choices, opens the feed
  showIntroAgain: () => Promise<void>; // reopens the wizard, prefilled with the saved choices
  initial: OnboardingInitial; // what the wizard starts with
}

const GateContext = createContext<Gate | null>(null);
export const GateProvider = GateContext.Provider;

export function useGate(): Gate {
  const gate = useContext(GateContext);
  if (!gate) throw new Error('useGate must be used inside GateProvider');
  return gate;
}
