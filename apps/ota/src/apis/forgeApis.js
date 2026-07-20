// import { client } from '@repo/apis'
import { ENDPOINTS } from './constants'

// const axiosOta = client(import.meta.env.VITE_OTA_API_BASE_URL)

const retrieveForgeArtifacts = async (companyId) => {
  try {
    // const params = {}
    // if (companyId) {
    //   params.companyId = companyId
    // }
    // if (id) {
    //   params.id = id
    // }

    // const response = await axiosOta.get(ENDPOINTS.DEVICE_TYPE, { params })
    // return response
    return Promise.resolve({
      results: {
        forgeModels: [
          {
            id: 1,
            trainedModelMetadata: {
              trainedFor: {
                taskName: 'Set up coffee for breakfast',
                taskInstruction: 'Prepare a mug of coffee on the breakfast table.',
                subtaskInstruction: 'Pick up the white mug from the cabinet.',
                primarySkillName: 'PickObject'
              },
              trainingBase: {
                foundationModelName: 'GR00T N1.7'
              },
              dataset: {
                datasetName: 'coffee_pickup_v1',
                datasetVersion: 'v1',
                episodeCount: 120,
                frameCount: 84230
              },
              tags: ['coffee', 'pick-object', 'kitchen']
            },
            createdAt: new Date().toISOString()
          },
          {
            id: 2,
            trainedModelMetadata: {
              trainedFor: {
                taskName: 'Carrying a Ball',
                taskInstruction: 'Carry a ball.',
                subtaskInstruction: 'Pick up a ball and carry it.',
                primarySkillName: 'CarryObject'
              },
              trainingBase: {
                foundationModelName: 'GR00T N1.7'
              },
              dataset: {
                datasetName: 'ball_carrying_v1',
                datasetVersion: 'v1',
                episodeCount: 100,
                frameCount: 70000
              },
              tags: ['ball', 'carry-object', 'table']
            },
            createdAt: new Date().toISOString()
          },
          {
            id: 3,
            trainedModelMetadata: {
              trainedFor: {
                taskName: 'Greeting',
                taskInstruction: 'Greet the user.',
                subtaskInstruction: 'Say hello.',
                primarySkillName: 'Speak'
              },
              trainingBase: {
                foundationModelName: 'GR00T N1.7'
              },
              dataset: {
                datasetName: 'greeting_v1',
                datasetVersion: 'v1',
                episodeCount: 50,
                frameCount: 35000
              },
              tags: ['greeting', 'speak', 'living room']
            },
            createdAt: new Date().toISOString()
          }
        ]
      }
    })
  } catch (error) {
    console.error('Failed to retrieve devices:', error)
    throw error
  }
}

export { retrieveForgeArtifacts }
