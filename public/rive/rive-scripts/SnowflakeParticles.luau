-- Snowflake Particle System (Optimized v2: Unit Path + Snow Floor Cache)
-- Builds on v1 optimizations, adds dirty flag for snow floor path

-- Physics constants (tuned for snow)
local GRAVITY = 25
local AIR_DRAG = 0.995
local ROTATION_DECAY = 0.98

-- Base particle dimensions
local PARTICLE_WIDTH = 6
local PARTICLE_HEIGHT = 12

-- Drift configuration
local DRIFT_FREQUENCY_RANGE = { min = 0.5, max = 2.0 }
local DRIFT_AMPLITUDE_RANGE = { min = 10, max = 40 }

-- Top spawner configuration
local TOP_SPAWN_Y = -20
local TOP_SPAWN_VX_RANGE = { min = -20, max = 20 }
local TOP_SPAWN_VY_RANGE = { min = 20, max = 40 }
local TOP_SPAWN_SPREAD = 15

-- Safety net lifespan
local SAFETY_LIFESPAN = 60

-- Wind configuration
local WIND_WAVE_1_PERIOD = 11.3
local WIND_WAVE_2_PERIOD = 4.7
local WIND_WAVE_3_PERIOD = 2.1
local WIND_WAVE_1_WEIGHT = 0.6
local WIND_WAVE_2_WEIGHT = 0.3
local WIND_WAVE_3_WEIGHT = 0.1

-- Gust configuration
local GUST_DECAY = 0.94
local GUST_MIN_STRENGTH = 40
local GUST_MAX_STRENGTH = 80

-- Pointer interaction
local POINTER_VEL_SMOOTHING = 0.7
local POINTER_VEL_DELTA_WEIGHT = 0.3
local POINTER_VEL_FRAME_SCALE = 60
local POINTER_SPEED_NORMALIZATION = 500

-- Snow accumulation distribution
local ACCUMULATION_CENTER_WEIGHT = 0.6
local ACCUMULATION_NEIGHBOR_WEIGHT = 0.2

-- Bounds buffer (pixels beyond canvas before removal)
local BOUNDS_BUFFER_Y = 50
local BOUNDS_BUFFER_X = 100

-- Bezier curve smoothing
local BEZIER_HANDLE_FACTOR = 0.35

-- Snow mound variation (per-segment max height randomization)
local MAX_HEIGHT_VARIATION = 0.25

-- Cool blue colors for snowflakes
local COLORS: { Color } = {
  Color.rgba(173, 216, 230, 255),
  Color.rgba(135, 206, 250, 255),
  Color.rgba(176, 224, 230, 255),
  Color.rgba(200, 230, 255, 255),
  Color.rgba(230, 240, 255, 255),
}

-- Pre-created Paint objects for each color
local COLOR_PAINTS: { Paint } = {}

type Particle = {
  x: number,
  y: number,
  vx: number,
  vy: number,
  rotation: number,
  angularVelocity: number,
  age: number,
  lifespan: number,
  colorIndex: number,
  width: number,
  height: number,
  driftFreq: number,
  driftAmp: number,
  driftPhase: number,
  baseX: number,
  depth: number,
  -- Snowflake mode fields (optional, only used when particleShape=1)
  artboard: Artboard<{}>?,
  snowflakeVariant: number?,
}

type SnowflakeParticles = {
  -- Inputs
  topFlowRate: Input<number>,
  topVelocity: Input<number>,
  forceRadius: Input<number>,
  pushStrength: Input<number>,
  repelStrength: Input<number>,
  accumulationRate: Input<number>,
  maxSnowHeight: Input<number>,
  accumulationSegments: Input<number>,
  maxParticles: Input<number>,
  windStrength: Input<number>,
  gustFrequency: Input<number>,
  debugMode: Input<boolean>,
  -- Particle shape: 0=rectangle, 1=snowflake
  particleShape: Input<number>,
  -- Canvas dimensions from JS (for full-viewport spawning)
  canvasWidth: number,
  canvasHeight: number,
  -- Snowflake component artboard inputs (assigned in Rive Editor)
  snowflake01: Input<Artboard<{}>>,
  snowflake02: Input<Artboard<{}>>,
  snowflake03: Input<Artboard<{}>>,

  particles: { Particle },
  topSpawnAccumulator: number,
  canvasSize: Vector,

  -- Pointer state
  isPointerActive: boolean,
  pointerPos: Vector,
  pointerVel: Vector,
  lastPointerPos: Vector?,

  -- Accumulation state
  snowHeights: { number },
  snowMaxHeights: { number },
  segmentWidth: number,

  -- OPTIMIZATION #1: Unit path for particles
  unitPath: Path,

  -- OPTIMIZATION #2: Cached snow floor path + dirty flag
  snowFloorPath: Path,
  snowHeightsDirty: boolean,

  -- Reusable paint for snow floor
  snowPaint: Paint,

  -- Wind state
  windTime: number,
  baseWind: number,
  gustWind: number,
  currentWind: number,

  -- Stats
  peakParticleCount: number,
  frameCount: number,
  totalSpawned: number,
  totalRemoved: number,
  removedByPosition: number,
  removedByLifespan: number,
  removedByAccumulation: number,
  gustCount: number,

  -- Performance tracking
  drawTimeAccum: number,
  drawTimeSamples: number,
}

local function randomRange(min: number, max: number): number
  return min + math.random() * (max - min)
end

local function calculateBaseWind(time: number, strength: number): number
  local wave1 = math.sin(time * (2 * math.pi / WIND_WAVE_1_PERIOD))
    * WIND_WAVE_1_WEIGHT
  local wave2 = math.sin(time * (2 * math.pi / WIND_WAVE_2_PERIOD))
    * WIND_WAVE_2_WEIGHT
  local wave3 = math.sin(time * (2 * math.pi / WIND_WAVE_3_PERIOD))
    * WIND_WAVE_3_WEIGHT
  return (wave1 + wave2 + wave3) * strength
end

local function createParticle(
  x: number,
  y: number,
  vx: number,
  vy: number,
  spread: number
): Particle
  local spreadRad = math.rad(spread)
  local angle = randomRange(-spreadRad, spreadRad)
  local cosA = math.cos(angle)
  local sinA = math.sin(angle)

  local depth = randomRange(0.5, 1.2)

  return {
    x = x,
    y = y,
    vx = (vx * cosA - vy * sinA) * depth,
    vy = (vx * sinA + vy * cosA) * depth,
    rotation = randomRange(0, math.pi * 2),
    angularVelocity = randomRange(-2, 2),
    age = 0,
    lifespan = SAFETY_LIFESPAN,
    colorIndex = math.random(1, #COLORS),
    width = PARTICLE_WIDTH * randomRange(0.5, 1.5) * depth,
    height = PARTICLE_HEIGHT * randomRange(0.5, 1.5) * depth,
    driftFreq = randomRange(
      DRIFT_FREQUENCY_RANGE.min,
      DRIFT_FREQUENCY_RANGE.max
    ),
    driftAmp = randomRange(
      DRIFT_AMPLITUDE_RANGE.min,
      DRIFT_AMPLITUDE_RANGE.max
    ),
    driftPhase = randomRange(0, math.pi * 2),
    baseX = x,
    depth = depth,
  }
end

local function initSnowHeights(self: SnowflakeParticles)
  local segments = self.accumulationSegments
  local canvasWidth = self.canvasSize.x

  self.snowHeights = {}
  self.snowMaxHeights = {}

  -- Generate randomized max height multipliers for each segment
  for i = 1, segments do
    self.snowHeights[i] = 0
    local variation = randomRange(1 - MAX_HEIGHT_VARIATION, 1 + MAX_HEIGHT_VARIATION)
    self.snowMaxHeights[i] = variation
  end

  -- Smooth the multipliers so adjacent segments form natural mounds
  for pass = 1, 2 do
    local smoothed = {}
    for i = 1, segments do
      local left = self.snowMaxHeights[i - 1] or self.snowMaxHeights[i]
      local right = self.snowMaxHeights[i + 1] or self.snowMaxHeights[i]
      smoothed[i] = (left + self.snowMaxHeights[i] * 2 + right) / 4
    end
    self.snowMaxHeights = smoothed
  end

  if canvasWidth > 0 then
    self.segmentWidth = canvasWidth / segments
  else
    self.segmentWidth = 1
  end

  -- Mark dirty so path gets rebuilt
  self.snowHeightsDirty = true
end

local function init(self: SnowflakeParticles, context: Context): boolean
  -- Bind ViewModel properties to script state (for runtime control from web UI)
  local vm = context:viewModel()
  if vm then
    local topFlowRateProp = vm:getNumber('topFlowRate')
    if topFlowRateProp then
      if topFlowRateProp.value ~= 0 then
        self.topFlowRate = topFlowRateProp.value
      end
      topFlowRateProp:addListener(function()
        self.topFlowRate = topFlowRateProp.value
      end)
    end

    local topVelocityProp = vm:getNumber('topVelocity')
    if topVelocityProp then
      if topVelocityProp.value ~= 0 then
        self.topVelocity = topVelocityProp.value
      end
      topVelocityProp:addListener(function()
        self.topVelocity = topVelocityProp.value
      end)
    end

    local maxParticlesProp = vm:getNumber('maxParticles')
    if maxParticlesProp then
      if maxParticlesProp.value ~= 0 then
        self.maxParticles = maxParticlesProp.value
      end
      maxParticlesProp:addListener(function()
        self.maxParticles = maxParticlesProp.value
      end)
    end

    local forceRadiusProp = vm:getNumber('forceRadius')
    if forceRadiusProp then
      if forceRadiusProp.value ~= 0 then
        self.forceRadius = forceRadiusProp.value
      end
      forceRadiusProp:addListener(function()
        self.forceRadius = forceRadiusProp.value
      end)
    end

    local pushStrengthProp = vm:getNumber('pushStrength')
    if pushStrengthProp then
      if pushStrengthProp.value ~= 0 then
        self.pushStrength = pushStrengthProp.value
      end
      pushStrengthProp:addListener(function()
        self.pushStrength = pushStrengthProp.value
      end)
    end

    local repelStrengthProp = vm:getNumber('repelStrength')
    if repelStrengthProp then
      if repelStrengthProp.value ~= 0 then
        self.repelStrength = repelStrengthProp.value
      end
      repelStrengthProp:addListener(function()
        self.repelStrength = repelStrengthProp.value
      end)
    end

    local accumulationRateProp = vm:getNumber('accumulationRate')
    if accumulationRateProp then
      if accumulationRateProp.value ~= 0 then
        self.accumulationRate = accumulationRateProp.value
      end
      accumulationRateProp:addListener(function()
        self.accumulationRate = accumulationRateProp.value
      end)
    end

    local maxSnowHeightProp = vm:getNumber('maxSnowHeight')
    if maxSnowHeightProp then
      if maxSnowHeightProp.value ~= 0 then
        self.maxSnowHeight = maxSnowHeightProp.value
      end
      maxSnowHeightProp:addListener(function()
        self.maxSnowHeight = maxSnowHeightProp.value
      end)
    end

    local accumulationSegmentsProp = vm:getNumber('accumulationSegments')
    if accumulationSegmentsProp then
      if accumulationSegmentsProp.value ~= 0 then
        self.accumulationSegments = accumulationSegmentsProp.value
      end
      accumulationSegmentsProp:addListener(function()
        self.accumulationSegments = accumulationSegmentsProp.value
      end)
    end

    local windStrengthProp = vm:getNumber('windStrength')
    if windStrengthProp then
      if windStrengthProp.value ~= 0 then
        self.windStrength = windStrengthProp.value
      end
      windStrengthProp:addListener(function()
        self.windStrength = windStrengthProp.value
      end)
    end

    local gustFrequencyProp = vm:getNumber('gustFrequency')
    if gustFrequencyProp then
      if gustFrequencyProp.value ~= 0 then
        self.gustFrequency = gustFrequencyProp.value
      end
      gustFrequencyProp:addListener(function()
        self.gustFrequency = gustFrequencyProp.value
      end)
    end

    local debugModeProp = vm:getBoolean('debugMode')
    if debugModeProp then
      self.debugMode = debugModeProp.value
      debugModeProp:addListener(function()
        self.debugMode = debugModeProp.value
      end)
    end

    -- Particle shape selection (0=rectangle, 1=snowflake)
    local particleShapeProp = vm:getNumber('particleShape')
    if particleShapeProp then
      self.particleShape = particleShapeProp.value
      particleShapeProp:addListener(function()
        self.particleShape = particleShapeProp.value
        if self.debugMode then
          local shapeName = self.particleShape == 0 and 'Rectangle' or 'Snowflake'
          print(string.format('[ViewModel] particleShape updated: %s', shapeName))
        end
      end)
    end

    -- Canvas dimensions from JS runtime (for full-viewport spawning)
    local canvasWidthProp = vm:getNumber('canvasWidth')
    if canvasWidthProp then
      if canvasWidthProp.value ~= 0 then
        self.canvasWidth = canvasWidthProp.value
      end
      canvasWidthProp:addListener(function()
        self.canvasWidth = canvasWidthProp.value
        if self.debugMode then
          print(
            string.format(
              '[ViewModel] canvasWidth updated: %.0f',
              canvasWidthProp.value
            )
          )
        end
      end)
    end

    local canvasHeightProp = vm:getNumber('canvasHeight')
    if canvasHeightProp then
      if canvasHeightProp.value ~= 0 then
        self.canvasHeight = canvasHeightProp.value
      end
      canvasHeightProp:addListener(function()
        self.canvasHeight = canvasHeightProp.value
        if self.debugMode then
          print(
            string.format(
              '[ViewModel] canvasHeight updated: %.0f',
              canvasHeightProp.value
            )
          )
        end
      end)
    end
  end

  -- Original init code below
  self.particles = {}
  self.topSpawnAccumulator = 0

  self.isPointerActive = false
  self.pointerPos = Vector.origin()
  self.pointerVel = Vector.origin()
  self.lastPointerPos = nil

  self.snowHeights = {}
  self.segmentWidth = 1

  self.unitPath = Path.new()
  self.unitPath:moveTo(Vector.xy(-0.5, -0.5))
  self.unitPath:lineTo(Vector.xy(0.5, -0.5))
  self.unitPath:lineTo(Vector.xy(0.5, 0.5))
  self.unitPath:lineTo(Vector.xy(-0.5, 0.5))
  self.unitPath:close()

  for i, color in COLORS do
    COLOR_PAINTS[i] = Paint.with({ style = 'fill', color = color })
  end

  self.snowPaint =
    Paint.with({ style = 'fill', color = Color.rgba(240, 248, 255, 255) })
  self.snowFloorPath = Path.new()
  self.snowHeightsDirty = true

  self.windTime = randomRange(0, 100)
  self.baseWind = 0
  self.gustWind = 0
  self.currentWind = 0

  self.peakParticleCount = 0
  self.frameCount = 0
  self.totalSpawned = 0
  self.totalRemoved = 0
  self.removedByPosition = 0
  self.removedByLifespan = 0
  self.removedByAccumulation = 0
  self.gustCount = 0

  self.drawTimeAccum = 0
  self.drawTimeSamples = 0

  return true
end

local function resize(self: SnowflakeParticles, size: Vector)
  self.canvasSize = size
  initSnowHeights(self)
  if self.debugMode then
    print(string.format('[Init] Canvas resized to %.0fx%.0f', size.x, size.y))
    print(
      string.format(
        '[Init] Snow segments: %d, width: %.1f',
        self.accumulationSegments,
        self.segmentWidth
      )
    )
  end
end

local function getSegmentIndex(self: SnowflakeParticles, x: number): number
  local index = math.floor(x / self.segmentWidth) + 1
  if index < 1 then
    index = 1
  elseif index > self.accumulationSegments then
    index = self.accumulationSegments
  end
  return index
end

local function getSmoothedHeight(
  self: SnowflakeParticles,
  index: number
): number
  local heights = self.snowHeights

  local h = heights[index] or 0
  local h1Left = heights[index - 1] or h
  local h2Left = heights[index - 2] or h1Left
  local h3Left = heights[index - 3] or h2Left
  local h1Right = heights[index + 1] or h
  local h2Right = heights[index + 2] or h1Right
  local h3Right = heights[index + 3] or h2Right

  return (
    h3Left * 0.05
    + h2Left * 0.1
    + h1Left * 0.2
    + h * 0.3
    + h1Right * 0.2
    + h2Right * 0.1
    + h3Right * 0.05
  )
end

-- ============================================================
-- OPTIMIZATION #2: Build snow floor path (called only when dirty)
-- ============================================================
local function buildSnowFloorPath(self: SnowflakeParticles, effectiveWidth: number, effectiveHeight: number): Path
  local canvasHeight = effectiveHeight
  local canvasWidth = effectiveWidth
  local segments = self.accumulationSegments
  local segmentWidth = self.segmentWidth

  local snowPath = Path.new()

  -- Start at bottom-left
  snowPath:moveTo(Vector.xy(0, canvasHeight))

  -- First point - go up left edge
  local firstHeight = getSmoothedHeight(self, 1)
  local edgeY = canvasHeight - firstHeight
  snowPath:lineTo(Vector.xy(0, edgeY))

  -- Curve from left edge to first segment center
  local firstX = 0.5 * segmentWidth
  local firstY = canvasHeight - firstHeight
  snowPath:cubicTo(
    Vector.xy(firstX * 0.3, edgeY),
    Vector.xy(firstX * 0.6, firstY),
    Vector.xy(firstX, firstY)
  )

  -- Draw smooth cubic bezier curves between segments
  for i = 1, segments - 1 do
    local h0 = getSmoothedHeight(self, math.max(1, i - 1))
    local h1 = getSmoothedHeight(self, i)
    local h2 = getSmoothedHeight(self, i + 1)
    local h3 = getSmoothedHeight(self, math.min(segments, i + 2))

    local x1 = (i - 0.5) * segmentWidth
    local x2 = (i + 0.5) * segmentWidth

    local y1 = canvasHeight - h1
    local y2 = canvasHeight - h2

    local slope1 = (h2 - h0) / (2 * segmentWidth)
    local slope2 = (h3 - h1) / (2 * segmentWidth)

    local handleLen = segmentWidth * BEZIER_HANDLE_FACTOR

    local cp1x = x1 + handleLen
    local cp1y = y1 - slope1 * handleLen
    local cp2x = x2 - handleLen
    local cp2y = y2 + slope2 * handleLen

    snowPath:cubicTo(
      Vector.xy(cp1x, cp1y),
      Vector.xy(cp2x, cp2y),
      Vector.xy(x2, y2)
    )
  end

  -- Final segment from last center to right edge
  local lastHeight = getSmoothedHeight(self, segments)
  local lastX = (segments - 0.5) * segmentWidth
  local lastY = canvasHeight - lastHeight
  local rightEdgeY = canvasHeight - lastHeight

  local hPrev = getSmoothedHeight(self, math.max(1, segments - 1))
  local lastSlope = (lastHeight - hPrev) / segmentWidth

  local handleLen = segmentWidth * BEZIER_HANDLE_FACTOR
  local exitCp1x = lastX + handleLen
  local exitCp1y = lastY - lastSlope * handleLen

  snowPath:cubicTo(
    Vector.xy(exitCp1x, exitCp1y),
    Vector.xy(lastX + (canvasWidth - lastX) * 0.7, rightEdgeY),
    Vector.xy(canvasWidth, rightEdgeY)
  )

  -- Close along bottom
  snowPath:lineTo(Vector.xy(canvasWidth, canvasHeight))
  snowPath:close()

  return snowPath
end

local function advance(self: SnowflakeParticles, seconds: number): boolean
  -- Use JS-provided dimensions if available, otherwise fall back to resize dimensions
  local canvasWidth = self.canvasWidth > 0 and self.canvasWidth
    or self.canvasSize.x
  local canvasHeight = self.canvasHeight > 0 and self.canvasHeight
    or self.canvasSize.y

  if canvasWidth <= 0 then
    return true
  end

  -- Update wind time
  self.windTime = self.windTime + seconds

  -- Calculate base wind from layered sine waves
  self.baseWind = calculateBaseWind(self.windTime, self.windStrength)

  -- Check for new gust
  if
    self.gustFrequency > 0 and math.random() < self.gustFrequency * seconds
  then
    local gustStrength = randomRange(GUST_MIN_STRENGTH, GUST_MAX_STRENGTH)
    if math.random() > 0.5 then
      gustStrength = -gustStrength
    end
    self.gustWind = gustStrength
    self.gustCount = self.gustCount + 1
    if self.debugMode then
      print(
        string.format(
          '[Gust] #%d triggered! Strength: %.1f',
          self.gustCount,
          gustStrength
        )
      )
    end
  end

  -- Decay gust
  self.gustWind = self.gustWind * GUST_DECAY

  if math.abs(self.gustWind) < 0.1 then
    self.gustWind = 0
  end

  -- Combine winds
  self.currentWind = self.baseWind + self.gustWind

  local particles = self.particles
  local maxParticles = self.maxParticles
  local wind = self.currentWind
  local spawnedThisFrame = 0
  local removedThisFrame = 0
  local removedByPosThisFrame = 0
  local removedByLifeThisFrame = 0
  local removedByAccumThisFrame = 0

  -- Pointer force config
  local pointerActive = self.isPointerActive
  local pointerX = self.pointerPos.x
  local pointerY = self.pointerPos.y
  local pointerVelX = self.pointerVel.x
  local pointerVelY = self.pointerVel.y
  local forceRadius = self.forceRadius
  local pushStrength = self.pushStrength
  local repelStrength = self.repelStrength
  local forceRadiusSq = forceRadius * forceRadius

  -- Accumulation config
  local maxSnowHeightPx = canvasHeight * self.maxSnowHeight
  local accumulationRate = self.accumulationRate

  -- Spawn at top of canvas
  if #particles < maxParticles then
    self.topSpawnAccumulator = self.topSpawnAccumulator
      + self.topFlowRate * seconds
    while self.topSpawnAccumulator >= 1 and #particles < maxParticles do
      self.topSpawnAccumulator = self.topSpawnAccumulator - 1
      local particle = createParticle(
        randomRange(0, canvasWidth),
        TOP_SPAWN_Y,
        randomRange(TOP_SPAWN_VX_RANGE.min, TOP_SPAWN_VX_RANGE.max)
          * self.topVelocity,
        randomRange(TOP_SPAWN_VY_RANGE.min, TOP_SPAWN_VY_RANGE.max)
          * self.topVelocity,
        TOP_SPAWN_SPREAD
      )

      -- If in snowflake mode, create artboard instance
      if self.particleShape == 1 then
        local variant = math.random(1, 3)
        particle.snowflakeVariant = variant
        if variant == 1 and self.snowflake01 then
          particle.artboard = self.snowflake01:instance()
        elseif variant == 2 and self.snowflake02 then
          particle.artboard = self.snowflake02:instance()
        elseif variant == 3 and self.snowflake03 then
          particle.artboard = self.snowflake03:instance()
        end
      end

      table.insert(particles, particle)
      spawnedThisFrame = spawnedThisFrame + 1
    end
  end

  self.totalSpawned = self.totalSpawned + spawnedThisFrame

  -- Update particles
  local i = 1
  while i <= #particles do
    local p = particles[i]
    p.age = p.age + seconds

    local segmentIndex = getSegmentIndex(self, p.x)
    local currentSnowHeight = self.snowHeights[segmentIndex] or 0
    local groundY = canvasHeight - currentSnowHeight

    local isInBounds = p.x >= 0 and p.x <= canvasWidth
    local removeByAccum = p.y >= groundY and isInBounds
    local removeByPos = p.y > canvasHeight + BOUNDS_BUFFER_Y
      or p.x < -BOUNDS_BUFFER_X
      or p.x > canvasWidth + BOUNDS_BUFFER_X
    local removeByLife = p.age >= p.lifespan

    if removeByAccum then
      -- Add to snow accumulation (per-segment max for natural mounds)
      local segmentMax = maxSnowHeightPx * (self.snowMaxHeights[segmentIndex] or 1)
      if currentSnowHeight < segmentMax then
        local addAmount = accumulationRate
        self.snowHeights[segmentIndex] = math.min(
          (self.snowHeights[segmentIndex] or 0) + addAmount * ACCUMULATION_CENTER_WEIGHT,
          segmentMax
        )
        if segmentIndex > 1 then
          local leftMax = maxSnowHeightPx * (self.snowMaxHeights[segmentIndex - 1] or 1)
          self.snowHeights[segmentIndex - 1] = math.min(
            (self.snowHeights[segmentIndex - 1] or 0) + addAmount * ACCUMULATION_NEIGHBOR_WEIGHT,
            leftMax
          )
        end
        if segmentIndex < self.accumulationSegments then
          local rightMax = maxSnowHeightPx * (self.snowMaxHeights[segmentIndex + 1] or 1)
          self.snowHeights[segmentIndex + 1] = math.min(
            (self.snowHeights[segmentIndex + 1] or 0) + addAmount * ACCUMULATION_NEIGHBOR_WEIGHT,
            rightMax
          )
        end
        -- ============================================================
        -- OPTIMIZATION #2: Mark snow floor dirty when heights change
        -- ============================================================
        self.snowHeightsDirty = true
      end
      particles[i] = particles[#particles]
      particles[#particles] = nil
      removedThisFrame = removedThisFrame + 1
      removedByAccumThisFrame = removedByAccumThisFrame + 1
    elseif removeByPos or removeByLife then
      particles[i] = particles[#particles]
      particles[#particles] = nil
      removedThisFrame = removedThisFrame + 1
      if removeByPos then
        removedByPosThisFrame = removedByPosThisFrame + 1
      else
        removedByLifeThisFrame = removedByLifeThisFrame + 1
      end
    else
      -- Apply pointer forces
      if pointerActive then
        local dx = p.x - pointerX
        local dy = p.y - pointerY
        local distSq = dx * dx + dy * dy

        if distSq < forceRadiusSq and distSq > 0.000001 then
          local dist = math.sqrt(distSq)
          local normalizedDist = dist / forceRadius
          local falloff = (1 - normalizedDist) * (1 - normalizedDist)

          local dirX = dx / dist
          local dirY = dy / dist

          local repelForce = repelStrength * falloff
          p.vx = p.vx + dirX * repelForce * seconds
          p.vy = p.vy + dirY * repelForce * seconds

          local pointerSpeed =
            math.sqrt(pointerVelX * pointerVelX + pointerVelY * pointerVelY)
          if pointerSpeed > 1 then
            local pushForce = pushStrength * falloff * (pointerSpeed / POINTER_SPEED_NORMALIZATION)
            p.vx = p.vx + (pointerVelX / pointerSpeed) * pushForce * seconds
            p.vy = p.vy + (pointerVelY / pointerSpeed) * pushForce * seconds
            p.angularVelocity = p.angularVelocity
              + (pushForce * 0.02) * (math.random() - 0.5)
          end
        end
      end

      -- Standard physics
      p.vy = p.vy + (GRAVITY * p.depth) * seconds
      p.vx = p.vx + (wind / p.depth) * seconds
      p.vx = p.vx * AIR_DRAG
      p.vy = p.vy * AIR_DRAG
      p.baseX = p.baseX + p.vx * seconds
      p.y = p.y + p.vy * seconds
      p.x = p.baseX + math.sin(p.age * p.driftFreq + p.driftPhase) * p.driftAmp
      p.rotation = p.rotation + p.angularVelocity * seconds
      p.angularVelocity = p.angularVelocity * ROTATION_DECAY

      -- Advance artboard animation (snowflake mode)
      if p.artboard then
        p.artboard:advance(seconds)
      end

      i = i + 1
    end
  end

  self.totalRemoved = self.totalRemoved + removedThisFrame
  self.removedByPosition = self.removedByPosition + removedByPosThisFrame
  self.removedByLifespan = self.removedByLifespan + removedByLifeThisFrame
  self.removedByAccumulation = self.removedByAccumulation
    + removedByAccumThisFrame

  if #particles > self.peakParticleCount then
    self.peakParticleCount = #particles
  end

  -- Debug logging
  if self.debugMode then
    self.frameCount = self.frameCount + 1

    if self.frameCount % 60 == 0 then
      print(
        '─────────────────────────────────────────'
      )
      print(string.format('[Frame %d] System Status', self.frameCount))
      print(
        string.format(
          '  Particles: %d (peak: %d, max: %d)',
          #particles,
          self.peakParticleCount,
          maxParticles
        )
      )
      print(
        string.format(
          '  Lifetime: spawned=%d, removed=%d (%.0f%% accumulated)',
          self.totalSpawned,
          self.totalRemoved,
          self.totalRemoved > 0
              and (self.removedByAccumulation / self.totalRemoved * 100)
            or 0
        )
      )
      print(
        string.format(
          '  Wind: base=%.2f + gust=%.2f = %.2f',
          self.baseWind,
          self.gustWind,
          self.currentWind
        )
      )
      print(
        string.format(
          '  Gusts: %d triggered (frequency: %.2f/sec)',
          self.gustCount,
          self.gustFrequency
        )
      )

      local minHeight, maxHeight, avgHeight = maxSnowHeightPx, 0, 0
      for _, h in self.snowHeights do
        if h < minHeight then
          minHeight = h
        end
        if h > maxHeight then
          maxHeight = h
        end
        avgHeight = avgHeight + h
      end
      avgHeight = avgHeight / self.accumulationSegments
      print(
        string.format(
          '  Snow: min=%.1f, max=%.1f, avg=%.1f (cap=%.1f)',
          minHeight,
          maxHeight,
          avgHeight,
          maxSnowHeightPx
        )
      )

      if self.drawTimeSamples > 0 then
        local avgDrawMs = (self.drawTimeAccum / self.drawTimeSamples) * 1000
        print(
          string.format(
            '  ⚡ Draw avg: %.3f ms/frame (%d samples)',
            avgDrawMs,
            self.drawTimeSamples
          )
        )
        self.drawTimeAccum = 0
        self.drawTimeSamples = 0
      end

      if self.removedByLifespan > 0 then
        print(
          string.format(
            '  ⚠️  WARNING: %d particles removed by lifespan (stuck?)',
            self.removedByLifespan
          )
        )
      end

      if #particles >= maxParticles then
        print('  ⚠️  WARNING: At max particle capacity!')
      end
    end
  end

  return true
end

local function draw(self: SnowflakeParticles, renderer: Renderer)
  local drawStart = os.clock()

  -- Use JS-provided dimensions if available
  local canvasWidth = self.canvasWidth > 0 and self.canvasWidth
    or self.canvasSize.x
  local canvasHeight = self.canvasHeight > 0 and self.canvasHeight
    or self.canvasSize.y

  -- ============================================================
  -- OPTIMIZATION #2: Only rebuild snow floor path when dirty
  -- BEFORE: ~50+ Vector allocations per frame for bezier curves
  -- AFTER: 0 allocations when snow heights unchanged
  -- ============================================================
  if #self.snowHeights > 0 then
    if self.snowHeightsDirty then
      self.snowFloorPath = buildSnowFloorPath(self, canvasWidth, canvasHeight)
      self.snowHeightsDirty = false
    end
    renderer:drawPath(self.snowFloorPath, self.snowPaint)
  end

  -- Draw particles using either unit path (rectangles) or artboards (snowflakes)
  local unitPath = self.unitPath
  local isSnowflakeMode = self.particleShape == 1

  for _, p in self.particles do
    renderer:save()
    renderer:transform(Mat2D.withTranslation(p.x, p.y))
    renderer:transform(Mat2D.withRotation(p.rotation))

    if isSnowflakeMode and p.artboard then
      -- Snowflake mode: scale and draw artboard
      -- Use depth-based scaling for size variation (similar to rectangle mode)
      local scale = p.depth * 0.8  -- Adjust scale factor as needed
      renderer:transform(Mat2D.withScale(scale, scale))
      p.artboard:draw(renderer)
    else
      -- Rectangle mode: scale and draw unit path
      renderer:transform(Mat2D.withScale(p.width, p.height))
      renderer:drawPath(unitPath, COLOR_PAINTS[p.colorIndex])
    end
    renderer:restore()
  end

  -- Debug visualization (unchanged, runs rarely)
  if self.debugMode and #self.snowHeights > 0 then
    local debugPointPaint =
      Paint.with({ style = 'fill', color = Color.rgba(255, 0, 0, 255) })
    local debugControlPaint =
      Paint.with({ style = 'fill', color = Color.rgba(0, 255, 0, 200) })
    local debugLinePaint = Paint.with({
      style = 'stroke',
      color = Color.rgba(255, 255, 0, 150),
      thickness = 1,
    })

    local function drawDiamond(
      r: Renderer,
      x: number,
      y: number,
      size: number,
      p: Paint
    )
      local diamondPath = Path.new()
      diamondPath:moveTo(Vector.xy(x, y - size))
      diamondPath:lineTo(Vector.xy(x + size, y))
      diamondPath:lineTo(Vector.xy(x, y + size))
      diamondPath:lineTo(Vector.xy(x - size, y))
      diamondPath:close()
      r:drawPath(diamondPath, p)
    end

    local segments = self.accumulationSegments
    local segmentWidth = self.segmentWidth

    for i = 1, segments do
      local h = getSmoothedHeight(self, i)
      local x = (i - 0.5) * segmentWidth
      local y = canvasHeight - h
      drawDiamond(renderer, x, y, 5, debugPointPaint)
    end

    for i = 1, segments - 1 do
      local h0 = getSmoothedHeight(self, math.max(1, i - 1))
      local h1 = getSmoothedHeight(self, i)
      local h2 = getSmoothedHeight(self, i + 1)
      local h3 = getSmoothedHeight(self, math.min(segments, i + 2))

      local x1 = (i - 0.5) * segmentWidth
      local x2 = (i + 0.5) * segmentWidth

      local y1 = canvasHeight - h1
      local y2 = canvasHeight - h2

      local slope1 = (h2 - h0) / (2 * segmentWidth)
      local slope2 = (h3 - h1) / (2 * segmentWidth)

      local handleLen = segmentWidth * BEZIER_HANDLE_FACTOR

      local cp1x = x1 + handleLen
      local cp1y = y1 - slope1 * handleLen
      local cp2x = x2 - handleLen
      local cp2y = y2 + slope2 * handleLen

      drawDiamond(renderer, cp1x, cp1y, 3, debugControlPaint)
      drawDiamond(renderer, cp2x, cp2y, 3, debugControlPaint)

      local handlePath = Path.new()
      handlePath:moveTo(Vector.xy(x1, y1))
      handlePath:lineTo(Vector.xy(cp1x, cp1y))
      handlePath:moveTo(Vector.xy(cp2x, cp2y))
      handlePath:lineTo(Vector.xy(x2, y2))
      renderer:drawPath(handlePath, debugLinePaint)
    end

    local firstHeight = getSmoothedHeight(self, 1)
    local lastHeight = getSmoothedHeight(self, segments)
    drawDiamond(renderer, 0, canvasHeight - firstHeight, 5, debugPointPaint)
    drawDiamond(
      renderer,
      canvasWidth,
      canvasHeight - lastHeight,
      5,
      debugPointPaint
    )
  end

  local drawEnd = os.clock()
  self.drawTimeAccum = self.drawTimeAccum + (drawEnd - drawStart)
  self.drawTimeSamples = self.drawTimeSamples + 1
end

-- Pointer event handlers
local function handlePointerDown(self: SnowflakeParticles, event: PointerEvent)
  self.isPointerActive = true
  self.pointerPos = event.position
  self.lastPointerPos = event.position
  self.pointerVel = Vector.origin()
  event:hit()
end

local function handlePointerMove(self: SnowflakeParticles, event: PointerEvent)
  local newPos = event.position
  if self.lastPointerPos then
    local delta = newPos - self.lastPointerPos
    self.pointerVel = self.pointerVel * POINTER_VEL_SMOOTHING + delta * POINTER_VEL_FRAME_SCALE * POINTER_VEL_DELTA_WEIGHT
  end
  self.pointerPos = newPos
  self.lastPointerPos = newPos
  event:hit()
end

local function handlePointerUp(self: SnowflakeParticles, event: PointerEvent)
  self.isPointerActive = false
  self.pointerVel = Vector.origin()
  event:hit()
end

local function handlePointerExit(self: SnowflakeParticles, event: PointerEvent)
  self.isPointerActive = false
  self.pointerVel = Vector.origin()
  event:hit()
end

return function(): Layout<SnowflakeParticles>
  return {
    topFlowRate = 15,
    topVelocity = 0.8,
    forceRadius = 120,
    pushStrength = 800,
    repelStrength = 150,
    accumulationRate = 0.8,
    maxSnowHeight = 0.25,
    accumulationSegments = 12,
    maxParticles = 350,
    windStrength = 15,
    gustFrequency = 3,
    debugMode = false,
    -- Particle shape: 0=rectangle, 1=snowflake (default)
    particleShape = 1,
    -- Canvas dimensions from JS (0 = use resize callback dimensions)
    canvasWidth = 0,
    canvasHeight = 0,
    -- Snowflake artboard inputs (assigned in Rive Editor)
    snowflake01 = late(),
    snowflake02 = late(),
    snowflake03 = late(),

    particles = {},
    topSpawnAccumulator = 0,
    canvasSize = Vector.origin(),

    isPointerActive = false,
    pointerPos = Vector.origin(),
    pointerVel = Vector.origin(),
    lastPointerPos = nil,

    snowHeights = {},
    snowMaxHeights = {},
    segmentWidth = 1,

    unitPath = late(),
    snowFloorPath = late(),
    snowHeightsDirty = true,
    snowPaint = late(),

    windTime = 0,
    baseWind = 0,
    gustWind = 0,
    currentWind = 0,

    peakParticleCount = 0,
    frameCount = 0,
    totalSpawned = 0,
    totalRemoved = 0,
    removedByPosition = 0,
    removedByLifespan = 0,
    removedByAccumulation = 0,
    gustCount = 0,

    drawTimeAccum = 0,
    drawTimeSamples = 0,

    init = init,
    resize = resize,
    advance = advance,
    draw = draw,
    pointerDown = handlePointerDown,
    pointerMove = handlePointerMove,
    pointerUp = handlePointerUp,
    pointerExit = handlePointerExit,
  }
end
