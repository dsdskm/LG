/**
 * ROS 2 CDR binary message parser.
 * Works both on Main Thread and inside Web Workers.
 */
export function parseCDR(buffer, schemaName) {
  try {
    const view = new DataView(buffer)
    const isLE = view.getUint8(1) === 0x01
    let offset = 4

    // CDR 헤더(4바이트) 이후 상대 위치 기준 정렬
    const align = (n) => {
      const rel = offset - 4
      const mod = rel % n
      if (mod !== 0) offset += n - mod
    }

    const readU8 = () => {
      const v = view.getUint8(offset)
      offset += 1
      return v
    }
    const readU32 = () => {
      align(4)
      const v = view.getUint32(offset, isLE)
      offset += 4
      return v
    }
    const readI32 = () => {
      align(4)
      const v = view.getInt32(offset, isLE)
      offset += 4
      return v
    }
    const readF32 = () => {
      align(4)
      const v = view.getFloat32(offset, isLE)
      offset += 4
      return v
    }
    const readF64 = () => {
      align(8)
      const v = view.getFloat64(offset, isLE)
      offset += 8
      return v
    }

    const readString = () => {
      align(4)
      const len = view.getUint32(offset, isLE)
      offset += 4
      const bytes = new Uint8Array(buffer, offset, len > 0 ? len - 1 : 0)
      offset += len
      return new TextDecoder().decode(bytes)
    }

    const readHeader = () => ({
      stamp: { sec: readU32(), nanosec: readU32() },
      frame_id: readString()
    })

    const readPoint = () => ({ x: readF64(), y: readF64(), z: readF64() })
    const readQuaternion = () => ({ x: readF64(), y: readF64(), z: readF64(), w: readF64() })
    const readPose = () => ({ position: readPoint(), orientation: readQuaternion() })

    // ── std_msgs/msg/String ─────────────────────────────────────────
    // /lio_node/status (mapping / saving_map / relocalizing_gkr / ready / failed ...)
    if (schemaName === 'std_msgs/msg/String') {
      return { data: readString() }
    }

    // ── tf2_msgs/msg/TFMessage ──────────────────────────────────────
    // /tf, /tf_static — map->lio_odom->base_link 합성으로 로봇의 지도 기준 pose 를 구한다.
    if (schemaName === 'tf2_msgs/msg/TFMessage') {
      const transformsLen = readU32()
      const transforms = []
      for (let i = 0; i < transformsLen; i++) {
        const header = readHeader()
        const child_frame_id = readString()
        const translation = readPoint()
        const rotation = readQuaternion()
        transforms.push({ header, child_frame_id, transform: { translation, rotation } })
      }
      return { transforms }
    }

    // ── nav_msgs/msg/OccupancyGrid ──────────────────────────────────
    if (schemaName === 'nav_msgs/msg/OccupancyGrid') {
      const header = readHeader()
      // MapMetaData
      const map_load_time = { sec: readU32(), nanosec: readU32() }
      const resolution = readF32()
      const width = readU32()
      const height = readU32()
      const origin = readPose()
      // data: int8[]
      const dataLen = readU32()
      const data = new Int8Array(buffer, offset, dataLen)
      offset += dataLen
      return { header, info: { map_load_time, resolution, width, height, origin }, data }
    }

    // ── nav_msgs/msg/Path ───────────────────────────────────────────
    // /lio/path (매핑 중 주행 궤적)
    if (schemaName === 'nav_msgs/msg/Path') {
      const header = readHeader()
      const posesLen = readU32()
      const poses = []
      for (let i = 0; i < posesLen; i++) {
        const poseHeader = readHeader()
        poses.push({ header: poseHeader, pose: readPose() })
      }
      return { header, poses }
    }

    // ── nav_msgs/msg/Odometry ───────────────────────────────────────
    if (schemaName === 'nav_msgs/msg/Odometry') {
      const header = readHeader()
      const child_frame_id = readString()
      const pose = { pose: readPose() }
      align(8)
      offset += 36 * 8 // covariance 스킵
      const linear = { x: readF64(), y: readF64(), z: readF64() }
      const angular = { x: readF64(), y: readF64(), z: readF64() }
      align(8)
      offset += 36 * 8 // twist covariance 스킵
      return { header, child_frame_id, pose, twist: { twist: { linear, angular } } }
    }

    // ── sensor_msgs/msg/LaserScan ───────────────────────────────────
    if (schemaName === 'sensor_msgs/msg/LaserScan') {
      const header = readHeader()
      const angle_min = readF32()
      const angle_max = readF32()
      const angle_increment = readF32()
      const time_increment = readF32()
      const scan_time = readF32()
      const range_min = readF32()
      const range_max = readF32()
      const rangesLen = readU32()

      align(4)
      const ranges = new Float32Array(buffer, offset, rangesLen)
      offset += rangesLen * 4

      const intLen = readU32()
      align(4)
      const intensities = new Float32Array(buffer, offset, intLen)
      offset += intLen * 4

      return { header, angle_min, angle_max, angle_increment, range_min, range_max, ranges, intensities }
    }

    // ── sensor_msgs/msg/PointCloud2 ──────────────────────────────────
    if (schemaName === 'sensor_msgs/msg/PointCloud2') {
      const header = readHeader()
      const height = readU32()
      const width = readU32()

      const fieldsLen = readU32()
      const fields = []
      for (let i = 0; i < fieldsLen; i++) {
        const name = readString()
        const offsetVal = readU32()
        const datatype = readU8()
        align(4)
        const count = readU32()
        fields.push({ name, offset: offsetVal, datatype, count })
      }

      const is_bigendian = readU8()
      align(4)
      const point_step = readU32()
      const row_step = readU32()

      const dataLen = readU32()
      const dataBytes = new Uint8Array(buffer, offset, dataLen)
      offset += dataLen

      const is_dense = readU8()

      // fields 정보를 바탕으로 dataBytes에서 x, y 추출
      const xField = fields.find((f) => f.name === 'x')
      const yField = fields.find((f) => f.name === 'y')

      if (xField && yField) {
        const xOff = xField.offset
        const yOff = yField.offset
        const view = new DataView(dataBytes.buffer, dataBytes.byteOffset, dataBytes.byteLength)
        const totalPoints = width * height
        const isLE = !is_bigendian

        // 가비지 컬렉션 부하를 제거하기 위해 단일 flat Float32Array 할당
        const pointsArr = new Float32Array(totalPoints * 2)
        let validCount = 0

        for (let i = 0; i < totalPoints; i++) {
          const base = i * point_step
          if (base + xOff + 4 <= dataLen && base + yOff + 4 <= dataLen) {
            const x = view.getFloat32(base + xOff, isLE)
            const y = view.getFloat32(base + yOff, isLE)
            pointsArr[validCount * 2] = x
            pointsArr[validCount * 2 + 1] = y
            validCount++
          }
        }

        const points = validCount === totalPoints ? pointsArr : pointsArr.subarray(0, validCount * 2)
        return { header, points }
      }

      return { header, points: new Float32Array(0) }
    }

    return null
  } catch (e) {
    console.warn('CDR 파싱 오류:', e.message)
    return null
  }
}
