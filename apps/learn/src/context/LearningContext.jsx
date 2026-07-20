import React, { createContext, useContext, useReducer } from 'react'

const initialState = {
  selectedSource: null,
  selectedTask: null,

  selectedTaskflow: null,
  executionConfig: {
    robotIds: [],
    repeatCount: 1,
    purpose: 'data-collection',
    saveForLearning: true
  },
  currentExecution: null,
  episodeCandidates: [],
  episodeReviewMap: {},

  videoType: null,
  lbwPurpose: [],
  uploadedVideos: [],

  readinessStats: null,
  trainingJobs: []
}

const actions = {
  SET_SOURCE: 'SET_SOURCE',
  SET_TASK: 'SET_TASK',
  SET_TASKFLOW: 'SET_TASKFLOW',
  SET_EXECUTION_CONFIG: 'SET_EXECUTION_CONFIG',
  SET_EXECUTION: 'SET_EXECUTION',
  SET_EPISODE_CANDIDATES: 'SET_EPISODE_CANDIDATES',
  UPDATE_EPISODE_REVIEW: 'UPDATE_EPISODE_REVIEW',
  SET_VIDEO_TYPE: 'SET_VIDEO_TYPE',
  SET_LBW_PURPOSE: 'SET_LBW_PURPOSE',
  SET_READINESS_STATS: 'SET_READINESS_STATS',
  SET_TRAINING_JOBS: 'SET_TRAINING_JOBS'
}

function reducer(state, action) {
  switch (action.type) {
    case actions.SET_SOURCE:
      return { ...state, selectedSource: action.payload }
    case actions.SET_TASK:
      return { ...state, selectedTask: action.payload }
    case actions.SET_TASKFLOW:
      return { ...state, selectedTaskflow: action.payload }
    case actions.SET_EXECUTION_CONFIG:
      return { ...state, executionConfig: { ...state.executionConfig, ...action.payload } }
    case actions.SET_EXECUTION:
      return { ...state, currentExecution: action.payload }
    case actions.SET_EPISODE_CANDIDATES:
      return { ...state, episodeCandidates: action.payload }
    case actions.UPDATE_EPISODE_REVIEW:
      return {
        ...state,
        episodeReviewMap: {
          ...state.episodeReviewMap,
          [action.payload.episodeId]: action.payload.status
        }
      }
    case actions.SET_VIDEO_TYPE:
      return { ...state, videoType: action.payload }
    case actions.SET_LBW_PURPOSE:
      return { ...state, lbwPurpose: action.payload }
    case actions.SET_READINESS_STATS:
      return { ...state, readinessStats: action.payload }
    case actions.SET_TRAINING_JOBS:
      return { ...state, trainingJobs: action.payload }
    default:
      return state
  }
}

const LearningContext = createContext(null)

export function LearningProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const setSource = (source) => dispatch({ type: actions.SET_SOURCE, payload: source })
  const setTask = (task) => dispatch({ type: actions.SET_TASK, payload: task })
  const setTaskflow = (taskflow) => dispatch({ type: actions.SET_TASKFLOW, payload: taskflow })
  const setExecutionConfig = (config) => dispatch({ type: actions.SET_EXECUTION_CONFIG, payload: config })
  const setExecution = (execution) => dispatch({ type: actions.SET_EXECUTION, payload: execution })
  const setEpisodeCandidates = (candidates) => dispatch({ type: actions.SET_EPISODE_CANDIDATES, payload: candidates })
  const updateEpisodeReview = (episodeId, status) =>
    dispatch({ type: actions.UPDATE_EPISODE_REVIEW, payload: { episodeId, status } })
  const setVideoType = (type) => dispatch({ type: actions.SET_VIDEO_TYPE, payload: type })
  const setLbwPurpose = (purpose) => dispatch({ type: actions.SET_LBW_PURPOSE, payload: purpose })
  const setReadinessStats = (stats) => dispatch({ type: actions.SET_READINESS_STATS, payload: stats })
  const setTrainingJobs = (jobs) => dispatch({ type: actions.SET_TRAINING_JOBS, payload: jobs })

  return (
    <LearningContext.Provider
      value={{
        state,
        setSource,
        setTask,
        setTaskflow,
        setExecutionConfig,
        setExecution,
        setEpisodeCandidates,
        updateEpisodeReview,
        setVideoType,
        setLbwPurpose,
        setReadinessStats,
        setTrainingJobs
      }}
    >
      {children}
    </LearningContext.Provider>
  )
}

export function useLearning() {
  const ctx = useContext(LearningContext)
  if (!ctx) throw new Error('useLearning must be used within LearningProvider')
  return ctx
}
