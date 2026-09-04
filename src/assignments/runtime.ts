import type { AssignmentDefinition, AssignmentState } from '../shared/types.js';

export function createAssignmentState(definition: AssignmentDefinition): AssignmentState {
  return { id: definition.id, startedAt: new Date().toISOString(), completedObjectiveIds: [] };
}

export function completeObjective(state: AssignmentState, objectiveId: string): AssignmentState {
  if (state.completedObjectiveIds.includes(objectiveId)) return state;
  return { ...state, completedObjectiveIds: [...state.completedObjectiveIds, objectiveId] };
}

export function isAssignmentComplete(definition: AssignmentDefinition, state: AssignmentState): boolean {
  return definition.objectives.every((objective) => state.completedObjectiveIds.includes(objective.id));
}
