'use client';

import React from 'react';

export interface TaskIntakeData {
  projectId?: string;
  contactId?: string;
  status?: string;
}

interface TaskIntakeContextValue {
  openIntake: (data?: TaskIntakeData) => void;
}

export const TaskIntakeContext = React.createContext<TaskIntakeContextValue>({
  openIntake: () => {},
});

export const useTaskIntake = () => React.useContext(TaskIntakeContext);
