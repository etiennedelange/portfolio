<script module lang="ts">
	import earcut from 'earcut';

	export type DitherMethod = 'bayer' | 'halftone' | 'floyd';

	export interface DitheredObjectOptions {
		/** URL of the image to extrude and display: SVG, PNG, JPEG, WebP, or GIF. Object URLs from a file input work too. The format is sniffed from the bytes, not the extension. */
		src?: string;
		/** Dither pattern: an ordered Bayer grid, clustered halftone dots, or Floyd-Steinberg error diffusion. */
		method?: DitherMethod;
		/** Size of the dither cells in CSS pixels. */
		gridSize?: number;
		/** Extra pixelation applied on top of the grid size (1 to 10). */
		pixelSizeRatio?: number;
		/** Collapse the scene to grayscale before dithering. */
		grayscale?: boolean;
		/** Invert the final colors. */
		invert?: boolean;
		/** Enable the dither pass. Turn off to see the raw render. */
		dither?: boolean;
		/** Background color behind the object. Empty string keeps the canvas transparent. */
		background?: string;
		/** Accent color of the ring light in the studio environment. */
		highlight?: string;
		/** Brightness of the studio environment lighting. */
		environmentIntensity?: number;
		/** Roughness override (0 to 1). Negative keeps the default of 0.6. */
		roughness?: number;
		/** Size of the longest side of the object in scene units. The camera sits about 4 units away. */
		scale?: number;
		/** Horizontal offset of the object in scene units. */
		xOffset?: number;
		/** Vertical offset of the object in scene units. */
		yOffset?: number;
		/** Strength of the floating bob animation (0 disables). */
		floatIntensity?: number;
		/** Strength of the idle rocking rotation (0 disables). */
		rotationIntensity?: number;
		/** Speed of the float and rocking animation. */
		floatSpeed?: number;
		/** Let the user orbit the camera by dragging. */
		orbit?: boolean;
		/** Let the user zoom with the scroll wheel or pinch. */
		zoom?: boolean;
		/** Spin the camera around the object turntable-style. */
		autoRotate?: boolean;
		/** Turntable speed when autoRotate is on. */
		autoRotateSpeed?: number;
		/** Camera field of view in degrees. */
		fov?: number;
		/** Camera distance from the center of the object. */
		cameraDistance?: number;
		/** Called after an asset finishes loading. */
		onLoad?: (() => void) | null;
		/** Called when an asset fails to load. */
		onError?: ((error: unknown) => void) | null;
	}

	export interface DitheredObjectElements {
		/** Canvas the scene renders to. */
		canvas: HTMLCanvasElement;
	}

	export interface DitheredObjectInstance {
		/** Update options live. Changing src loads the new asset. */
		setOptions: (options: DitheredObjectOptions) => void;
		/** Re-read canvas size. Call when the element is resized. */
		resize: () => void;
		/** Stop the loop and release all GPU resources. */
		destroy: () => void;
	}

	const DEFAULTS: Required<DitheredObjectOptions> = {
		src: '',
		method: 'bayer',
		gridSize: 4,
		pixelSizeRatio: 1,
		grayscale: true,
		invert: false,
		dither: true,
		background: '',
		highlight: '#066aff',
		environmentIntensity: 0.1,
		roughness: -1,
		scale: 3,
		xOffset: 0,
		yOffset: 0,
		floatIntensity: 2,
		rotationIntensity: 1,
		floatSpeed: 2,
		orbit: true,
		zoom: false,
		autoRotate: false,
		autoRotateSpeed: 2,
		fov: 65,
		cameraDistance: 4.2,
		onLoad: null,
		onError: null
	};

	const POST_VERT = `
in vec3 position;
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

	const SRGB_ENCODE = `
vec3 toSrgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}
`;

	const LEVEL_FRAG = `
precision highp float;
out vec4 outColor;
uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uGridSize;
uniform float uPixelSizeRatio;
${SRGB_ENCODE}
void main() {
  vec2 fragCoord = (floor(gl_FragCoord.xy) + 0.5) * uGridSize;
  float pixelSize = uGridSize * uPixelSizeRatio;
  vec2 pixelUv = (floor(fragCoord / pixelSize) + 0.5) * pixelSize / uResolution;
  vec4 tex = texture(tDiffuse, pixelUv);
  outColor = vec4(toSrgb(tex.rgb), tex.a);
}`;

	const POST_FRAG = `
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D tDiffuse;
uniform vec2 uResolution;
uniform float uGridSize;
uniform float uPixelSizeRatio;
uniform float uGrayscale;
uniform float uInvert;
uniform float uDither;
uniform int uMethod;
uniform sampler2D tMask;

const mat4 THRESHOLDS = mat4(
  0.94118, 0.29412, 0.76471, 0.05882,
  0.47059, 0.70588, 0.23529, 0.52941,
  0.82353, 0.11765, 0.88235, 0.17647,
  0.35294, 0.58824, 0.41176, 0.64706
);

const float SCREEN_ANGLE = 0.70710678;
const float CORNER_REACH = 1.41421356;
${SRGB_ENCODE}
float bayerThreshold(vec2 cellCoord) {
  ivec2 p = ivec2(mod(cellCoord, 4.0));
  return THRESHOLDS[p.x][p.y];
}

float halftoneThreshold(vec2 cellCoord) {
  vec2 screen = vec2(
    cellCoord.x * SCREEN_ANGLE - cellCoord.y * SCREEN_ANGLE,
    cellCoord.x * SCREEN_ANGLE + cellCoord.y * SCREEN_ANGLE
  );
  return clamp(length(fract(screen) - 0.5) * CORNER_REACH, 0.0, 1.0);
}

float thresholdAt(vec2 cellCoord) {
  if (uMethod == 1) return halftoneThreshold(cellCoord);
  return bayerThreshold(cellCoord);
}

bool maskAt(vec2 cellCoord) {
  ivec2 last = textureSize(tMask, 0) - ivec2(1);
  ivec2 cell = clamp(ivec2(floor(cellCoord)), ivec2(0), last);
  return texelFetch(tMask, cell, 0).r > 0.5;
}

void main() {
  vec2 fragCoord = vUv * uResolution;
  if (uDither < 0.5) {
    vec4 raw = texture(tDiffuse, vUv);
    outColor = vec4(toSrgb(raw.rgb) * raw.a, raw.a);
    return;
  }
  float pixelSize = uGridSize * uPixelSizeRatio;

  vec2 pixelUv = (floor(fragCoord / pixelSize) + 0.5) * pixelSize / uResolution;
  vec4 tex = texture(tDiffuse, pixelUv);
  vec3 color = toSrgb(tex.rgb);

  float level = dot(color, vec3(1.0));
  if (uGrayscale > 0.5) color = vec3(level);
  vec2 cellCoord = fragCoord / uGridSize;
  bool lit = uMethod == 2
    ? maskAt(cellCoord)
    : level >= thresholdAt(cellCoord);
  if (!lit) color = vec3(0.0);
  if (uInvert > 0.5) color = 1.0 - color;

  outColor = vec4(color * tex.a, tex.a);
}`;

	function diffuse(
		pixels: Uint8Array,
		mask: Uint8Array,
		rows: [Float32Array, Float32Array],
		width: number,
		height: number
	) {
		let current = rows[0];
		let next = rows[1];
		current.fill(0);
		for (let y = 0; y < height; y++) {
			next.fill(0);
			const row = y * width;
			for (let x = 0; x < width; x++) {
				const i = (row + x) * 4;
				const tone =
					Math.min((pixels[i] + pixels[i + 1] + pixels[i + 2]) / 255, 1) + current[x + 1];
				const lit = tone >= 0.5;
				mask[row + x] = lit ? 255 : 0;
				const error = lit ? tone - 1 : tone;
				current[x + 2] += error * 0.4375;
				next[x] += error * 0.1875;
				next[x + 1] += error * 0.3125;
				next[x + 2] += error * 0.0625;
			}
			const spent = current;
			current = next;
			next = spent;
		}
	}

	/*
	 * The object is lit only by a blurred "studio room" environment (gray walls, overhead
	 * point lights, bright side panels and a ring light in the highlight color). The room is
	 * baked into 9-term spherical harmonics of irradiance / π: one set for the room itself and
	 * one per unit of ring-light color, so the highlight can still change at runtime.
	 * Terms, in order: 1, y, z, x, xy, yz, 3z² − 1, xz, x² − y².
	 */
	const ROOM_SH = [1.31747, 1.39546, -0.10549, 0.02459, 0.06541, -0.12976, -0.13237, -0.14656, -0.43545];
	const RING_SH = [0.09641, 0.10039, -0.01279, 0.03125, -0.01229, 0.01404, -0.00676, 0.04407, -0.00576];
	const RING_INTENSITY = 15;
	const BASE_ROUGHNESS = 0.6;

	const MESH_VERT = `
in vec3 position;
in vec3 normal;
in vec2 uv;
uniform mat4 uModel;
uniform mat4 uViewProjection;
uniform mat3 uNormalMatrix;
out vec3 vWorldPosition;
out vec3 vNormal;
out vec2 vUv;
void main() {
  vec4 world = uModel * vec4(position, 1.0);
  vWorldPosition = world.xyz;
  vNormal = uNormalMatrix * normal;
  vUv = uv;
  gl_Position = uViewProjection * world;
}`;

	// Image-based lighting term by term as three.js's MeshStandardMaterial (dielectric, IBL only).
	const MESH_FRAG = `
precision highp float;
in vec3 vWorldPosition;
in vec3 vNormal;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uMap;
uniform vec3 uSH[9];
uniform vec3 uCameraPosition;
uniform float uEnvIntensity;
uniform float uRoughness;

vec3 irradiance(vec3 n) {
  vec3 e = uSH[0]
    + uSH[1] * n.y + uSH[2] * n.z + uSH[3] * n.x
    + uSH[4] * (n.x * n.y) + uSH[5] * (n.y * n.z) + uSH[6] * (3.0 * n.z * n.z - 1.0)
    + uSH[7] * (n.x * n.z) + uSH[8] * (n.x * n.x - n.y * n.y);
  return max(e, 0.0) * uEnvIntensity;
}

vec2 dfgApprox(float dotNV, float roughness) {
  const vec4 c0 = vec4(-1.0, -0.0275, -0.572, 0.022);
  const vec4 c1 = vec4(1.0, 0.0425, 1.04, -0.04);
  vec4 r = roughness * c0 + c1;
  float a004 = min(r.x * r.x, exp2(-9.28 * dotNV)) * r.x + r.y;
  return vec2(-1.04, 1.04) * a004 + r.zw;
}

void main() {
  vec3 n = normalize(vNormal);
  vec3 v = normalize(uCameraPosition - vWorldPosition);
  vec3 albedo = texture(uMap, vUv).rgb;
  float roughness = clamp(uRoughness, 0.0525, 1.0);

  vec3 reflected = normalize(mix(reflect(-v, n), n, roughness * roughness));
  vec3 cosineIrradiance = irradiance(n);
  vec3 radiance = irradiance(reflected);

  const vec3 specular = vec3(0.04);
  vec2 fab = dfgApprox(clamp(dot(n, v), 0.0, 1.0), roughness);
  vec3 single = specular * fab.x + fab.y;
  float ess = fab.x + fab.y;
  float ems = 1.0 - ess;
  vec3 favg = specular + (1.0 - specular) * 0.047619;
  vec3 multi = single * favg / (1.0 - ems * favg) * ems;
  vec3 total = single + multi;
  vec3 diffuse = albedo * (1.0 - max(max(total.r, total.g), total.b));

  outColor = vec4(diffuse * cosineIrradiance + single * radiance + multi * cosineIrradiance, 1.0);
}`;


	type Vec3 = [number, number, number];
	type Mat4 = Float32Array;

	function multiply(a: Mat4, b: Mat4): Mat4 {
		const out = new Float32Array(16);
		for (let col = 0; col < 4; col++) {
			for (let row = 0; row < 4; row++) {
				let sum = 0;
				for (let k = 0; k < 4; k++) sum += a[k * 4 + row] * b[col * 4 + k];
				out[col * 4 + row] = sum;
			}
		}
		return out;
	}

	function perspective(fovDegrees: number, aspect: number, near: number, far: number): Mat4 {
		const f = 1 / Math.tan((fovDegrees * Math.PI) / 360);
		const out = new Float32Array(16);
		out[0] = f / aspect;
		out[5] = f;
		out[10] = (far + near) / (near - far);
		out[11] = -1;
		out[14] = (2 * far * near) / (near - far);
		return out;
	}

	function lookAt(eye: Vec3): Mat4 {
		let [zx, zy, zz] = eye;
		const zl = Math.hypot(zx, zy, zz) || 1;
		zx /= zl;
		zy /= zl;
		zz /= zl;
		// x = up(0,1,0) × z
		let xx = zz;
		let xz = -zx;
		const xl = Math.hypot(xx, xz) || 1;
		xx /= xl;
		xz /= xl;
		// y = z × x
		const yx = zy * xz;
		const yy = zz * xx - zx * xz;
		const yz = -zy * xx;
		const out = new Float32Array(16);
		out.set([xx, yx, zx, 0, 0, yy, zy, 0, xz, yz, zz, 0]);
		out[12] = -(xx * eye[0] + xz * eye[2]);
		out[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
		out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
		out[15] = 1;
		return out;
	}

	/** translate(position) · rotateX · rotateY · rotateZ · scale(s) · translate(-center) */
	function modelMatrix(position: Vec3, rotation: Vec3, scale: number, center: Vec3): Mat4 {
		const [cx, sx] = [Math.cos(rotation[0]), Math.sin(rotation[0])];
		const [cy, sy] = [Math.cos(rotation[1]), Math.sin(rotation[1])];
		const [cz, sz] = [Math.cos(rotation[2]), Math.sin(rotation[2])];
		// Columns of Rx·Ry·Rz (three.js Euler order XYZ).
		const r = [
			cy * cz, cx * sz + sx * sy * cz, sx * sz - cx * sy * cz,
			-cy * sz, cx * cz - sx * sy * sz, sx * cz + cx * sy * sz,
			sy, -sx * cy, cx * cy
		];
		const out = new Float32Array(16);
		for (let col = 0; col < 3; col++) {
			for (let row = 0; row < 3; row++) out[col * 4 + row] = r[col * 3 + row] * scale;
		}
		for (let row = 0; row < 3; row++) {
			out[12 + row] =
				position[row] -
				(out[row] * center[0] + out[4 + row] * center[1] + out[8 + row] * center[2]);
		}
		out[15] = 1;
		return out;
	}

	function srgbToLinear(value: number) {
		return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
	}

	let colorProbe: CanvasRenderingContext2D | null = null;

	/** Parse any CSS color into linear RGB plus alpha. */
	function parseColor(color: string): [number, number, number, number] {
		colorProbe ??= document.createElement('canvas').getContext('2d');
		if (!colorProbe) return [0, 0, 0, 1];
		colorProbe.fillStyle = '#000';
		colorProbe.fillStyle = color;
		const value = String(colorProbe.fillStyle);
		let channels: number[];
		if (value.startsWith('#')) {
			const hex = parseInt(value.slice(1), 16);
			channels = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255, 255].map((c) => c / 255);
		} else {
			const parts = value.match(/[\d.]+/g)?.map(Number) ?? [];
			channels = [parts[0] / 255, parts[1] / 255, parts[2] / 255, parts[3] ?? 1];
		}
		return [
			srgbToLinear(channels[0]),
			srgbToLinear(channels[1]),
			srgbToLinear(channels[2]),
			channels[3]
		];
	}

	const CAMERA_DIR: Vec3 = [0, -1 / Math.sqrt(17), 4 / Math.sqrt(17)];
	const MODEL_LIFT = 0.3;
	const RASTER_SIZE = 2048;
	const TRACE_SIZE = 512;
	const ALPHA_CUTOFF = 127;
	const SIMPLIFY_TOLERANCE = 1;
	const MIN_AREA = 6;
	const MAX_CONTOURS = 64;
	const EXTRUDE_DEPTH = 0.08;
	const BEVEL_SIZE = 0.006;
	const METHOD_INDEX: Record<DitherMethod, number> = {
		bayer: 0,
		halftone: 1,
		floyd: 2
	};

	type AssetKind = 'svg' | 'bitmap';

	function sniffKind(bytes: Uint8Array): AssetKind | null {
		if (bytes.length < 4) return null;
		const ascii = (start: number, text: string) => {
			for (let i = 0; i < text.length; i++) {
				if (bytes[start + i] !== text.charCodeAt(i)) return false;
			}
			return true;
		};
		if (bytes[0] === 0x89 && ascii(1, 'PNG')) return 'bitmap';
		if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'bitmap';
		if (ascii(0, 'RIFF') && ascii(8, 'WEBP')) return 'bitmap';
		if (ascii(0, 'GIF8')) return 'bitmap';
		let head = '';
		try {
			head = new TextDecoder()
				.decode(bytes.subarray(0, 2048))
				.replace(/^\uFEFF/, '')
				.trimStart();
		} catch {
			return null;
		}
		if (head.startsWith('<')) return head.includes('<svg') ? 'svg' : null;
		return null;
	}

	function makeCanvas(width: number, height: number) {
		const canvas = document.createElement('canvas');
		canvas.width = Math.max(1, Math.round(width));
		canvas.height = Math.max(1, Math.round(height));
		return canvas;
	}

	function drawToCanvas(source: CanvasImageSource, width: number, height: number) {
		const canvas = makeCanvas(width, height);
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('2d context unavailable');
		ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
		return canvas;
	}

	function decodeWithImage(blob: Blob): Promise<HTMLImageElement> {
		return new Promise((resolve, reject) => {
			const url = URL.createObjectURL(blob);
			const image = new Image();
			image.onload = () => {
				URL.revokeObjectURL(url);
				resolve(image);
			};
			image.onerror = () => {
				URL.revokeObjectURL(url);
				reject(new Error('Could not decode the image'));
			};
			image.src = url;
		});
	}

	async function decodeWithBitmap(blob: Blob): Promise<HTMLCanvasElement | null> {
		if (typeof createImageBitmap !== 'function') return null;
		try {
			const bitmap = await createImageBitmap(blob);
			const longest = Math.max(bitmap.width, bitmap.height, 1);
			const scale = Math.min(1, RASTER_SIZE / longest);
			const canvas = drawToCanvas(bitmap, bitmap.width * scale, bitmap.height * scale);
			bitmap.close();
			return canvas;
		} catch {
			return null;
		}
	}

	async function decodeImage(blob: Blob, kind: AssetKind): Promise<HTMLCanvasElement> {
		const vector = kind === 'svg';
		if (!vector) {
			const decoded = await decodeWithBitmap(blob);
			if (decoded) return decoded;
		}
		const image = await decodeWithImage(blob);
		const width = image.naturalWidth || RASTER_SIZE;
		const height = image.naturalHeight || RASTER_SIZE;
		const longest = Math.max(width, height, 1);
		const scale = vector ? RASTER_SIZE / longest : Math.min(1, RASTER_SIZE / longest);
		return drawToCanvas(image, width * scale, height * scale);
	}

	function traceContours(inside: Uint8Array, width: number, height: number) {
		const segments: number[] = [];
		for (let y = 0; y < height - 1; y++) {
			for (let x = 0; x < width - 1; x++) {
				const base = y * width + x;
				const code =
					inside[base] |
					(inside[base + 1] << 1) |
					(inside[base + width + 1] << 2) |
					(inside[base + width] << 3);
				if (code === 0 || code === 15) continue;
				const top = x + 0.5;
				const right = y + 0.5;
				switch (code) {
					case 1:
					case 14:
						segments.push(x, right, top, y);
						break;
					case 2:
					case 13:
						segments.push(top, y, x + 1, right);
						break;
					case 3:
					case 12:
						segments.push(x, right, x + 1, right);
						break;
					case 4:
					case 11:
						segments.push(x + 1, right, top, y + 1);
						break;
					case 6:
					case 9:
						segments.push(top, y, top, y + 1);
						break;
					case 7:
					case 8:
						segments.push(x, right, top, y + 1);
						break;
					case 5:
						segments.push(x, right, top, y, x + 1, right, top, y + 1);
						break;
					default:
						segments.push(top, y, x + 1, right, x, right, top, y + 1);
						break;
				}
			}
		}

		const count = segments.length / 4;
		const stride = width * 2 + 1;
		const ends = new Map<number, number[]>();
		const keyAt = (index: number) => segments[index * 2 + 1] * 2 * stride + segments[index * 2] * 2;
		for (let i = 0; i < count; i++) {
			for (const end of [i * 2, i * 2 + 1]) {
				const key = keyAt(end);
				const bucket = ends.get(key);
				if (bucket) bucket.push(i);
				else ends.set(key, [i]);
			}
		}

		const used = new Uint8Array(count);
		const contours: number[][] = [];
		for (let start = 0; start < count; start++) {
			if (used[start]) continue;
			const points: number[] = [];
			let current = start;
			let x = segments[start * 4];
			let y = segments[start * 4 + 1];
			while (current >= 0 && !used[current]) {
				used[current] = 1;
				const head = current * 4;
				const forward = segments[head] === x && segments[head + 1] === y;
				x = forward ? segments[head + 2] : segments[head];
				y = forward ? segments[head + 3] : segments[head + 1];
				points.push(x, y);
				const bucket = ends.get(y * 2 * stride + x * 2);
				let next = -1;
				if (bucket) {
					for (const candidate of bucket) {
						if (!used[candidate]) {
							next = candidate;
							break;
						}
					}
				}
				current = next;
			}
			if (points.length >= 8) contours.push(points);
		}
		return contours;
	}

	function simplify(points: number[], tolerance: number) {
		const count = points.length / 2;
		if (count < 4) return points;
		const keep = new Uint8Array(count);
		keep[0] = 1;
		keep[count - 1] = 1;
		const stack = [0, count - 1];
		const toleranceSq = tolerance * tolerance;
		while (stack.length) {
			const last = stack.pop() as number;
			const first = stack.pop() as number;
			if (last - first < 2) continue;
			const ax = points[first * 2];
			const ay = points[first * 2 + 1];
			const dx = points[last * 2] - ax;
			const dy = points[last * 2 + 1] - ay;
			const lengthSq = dx * dx + dy * dy;
			let farthest = -1;
			let farthestSq = toleranceSq;
			for (let i = first + 1; i < last; i++) {
				const px = points[i * 2] - ax;
				const py = points[i * 2 + 1] - ay;
				const t = lengthSq > 0 ? (px * dx + py * dy) / lengthSq : 0;
				const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
				const ox = px - dx * clamped;
				const oy = py - dy * clamped;
				const distanceSq = ox * ox + oy * oy;
				if (distanceSq > farthestSq) {
					farthest = i;
					farthestSq = distanceSq;
				}
			}
			if (farthest < 0) continue;
			keep[farthest] = 1;
			stack.push(first, farthest, farthest, last);
		}
		const result: number[] = [];
		for (let i = 0; i < count; i++) {
			if (keep[i]) result.push(points[i * 2], points[i * 2 + 1]);
		}
		return result;
	}

	function ringArea(points: number[]) {
		let area = 0;
		for (let i = 0, j = points.length - 2; i < points.length; j = i, i += 2) {
			area += (points[j] - points[i]) * (points[j + 1] + points[i + 1]);
		}
		return Math.abs(area) / 2;
	}

	function ringContains(points: number[], x: number, y: number) {
		let inside = false;
		for (let i = 0, j = points.length - 2; i < points.length; j = i, i += 2) {
			const yi = points[i + 1];
			const yj = points[j + 1];
			if (yi > y === yj > y) continue;
			const t = (y - yi) / (yj - yi);
			if (x < points[i] + t * (points[j] - points[i])) inside = !inside;
		}
		return inside;
	}

	interface ShapeRings {
		outer: number[];
		holes: number[][];
	}

	function signedArea(points: number[]) {
		let area = 0;
		for (let i = 0, j = points.length - 2; i < points.length; j = i, i += 2) {
			area += (points[j] - points[i]) * (points[j + 1] + points[i + 1]);
		}
		return area / 2;
	}

	function oriented(points: number[], counterClockwise: boolean) {
		if (signedArea(points) > 0 === counterClockwise) return points;
		const reversed: number[] = [];
		for (let i = points.length - 2; i >= 0; i -= 2) reversed.push(points[i], points[i + 1]);
		return reversed;
	}

	interface Geometry {
		positions: Float32Array;
		normals: Float32Array;
		uvs: Float32Array;
		count: number;
		center: Vec3;
		maxDim: number;
	}

	/** Extrude flat rings into a closed slab: front and back caps plus flat-shaded side walls. */
	function extrude(shapes: ShapeRings[], aspectW: number, aspectH: number): Geometry {
		const positions: number[] = [];
		const normals: number[] = [];
		const push = (x: number, y: number, z: number, nx: number, ny: number, nz: number) => {
			positions.push(x, y, z);
			normals.push(nx, ny, nz);
		};

		for (const shape of shapes) {
			const rings = [oriented(shape.outer, true), ...shape.holes.map((hole) => oriented(hole, false))];
			const flat: number[] = [];
			const holeIndices: number[] = [];
			for (const [index, ring] of rings.entries()) {
				if (index > 0) holeIndices.push(flat.length / 2);
				flat.push(...ring);
			}
			const triangles = earcut(flat, holeIndices);
			for (let i = 0; i < triangles.length; i += 3) {
				const [a, b, c] = [triangles[i], triangles[i + 1], triangles[i + 2]];
				for (const index of [a, b, c]) push(flat[index * 2], flat[index * 2 + 1], EXTRUDE_DEPTH, 0, 0, 1);
				for (const index of [c, b, a]) push(flat[index * 2], flat[index * 2 + 1], 0, 0, 0, -1);
			}

			// Outer rings run counter-clockwise and holes clockwise, so (dy, -dx) always faces out of the solid.
			for (const ring of rings) {
				for (let i = 0; i < ring.length; i += 2) {
					const j = (i + 2) % ring.length;
					const [x0, y0, x1, y1] = [ring[i], ring[i + 1], ring[j], ring[j + 1]];
					const length = Math.hypot(x1 - x0, y1 - y0) || 1;
					const nx = (y1 - y0) / length;
					const ny = -(x1 - x0) / length;
					push(x0, y0, 0, nx, ny, 0);
					push(x1, y1, 0, nx, ny, 0);
					push(x1, y1, EXTRUDE_DEPTH, nx, ny, 0);
					push(x0, y0, 0, nx, ny, 0);
					push(x1, y1, EXTRUDE_DEPTH, nx, ny, 0);
					push(x0, y0, EXTRUDE_DEPTH, nx, ny, 0);
				}
			}
		}

		const count = positions.length / 3;
		const uvs = new Float32Array(count * 2);
		const min: Vec3 = [Infinity, Infinity, Infinity];
		const max: Vec3 = [-Infinity, -Infinity, -Infinity];
		for (let i = 0; i < count; i++) {
			uvs[i * 2] = positions[i * 3] / aspectW;
			uvs[i * 2 + 1] = positions[i * 3 + 1] / aspectH;
			for (let axis = 0; axis < 3; axis++) {
				min[axis] = Math.min(min[axis], positions[i * 3 + axis]);
				max[axis] = Math.max(max[axis], positions[i * 3 + axis]);
			}
		}
		// Pad by the bevel the three.js version used so the object fits the frame the same way.
		const size = [0, 1, 2].map((axis) => max[axis] - min[axis] + BEVEL_SIZE * 2);
		return {
			positions: new Float32Array(positions),
			normals: new Float32Array(normals),
			uvs,
			count,
			center: [0, 1, 2].map((axis) => (min[axis] + max[axis]) / 2) as Vec3,
			maxDim: Math.max(size[0], size[1], size[2], 1e-4)
		};
	}

	function buildShapes(canvas: HTMLCanvasElement, aspectW: number, aspectH: number): ShapeRings[] {
		const rectangle = () => [{ outer: [0, 0, aspectW, 0, aspectW, aspectH, 0, aspectH], holes: [] }];

		const scale = Math.min(1, TRACE_SIZE / Math.max(canvas.width, canvas.height, 1));
		const trace =
			scale < 1 ? drawToCanvas(canvas, canvas.width * scale, canvas.height * scale) : canvas;
		const ctx = trace.getContext('2d', { willReadFrequently: true });
		if (!ctx) return rectangle();

		const traceW = trace.width;
		const traceH = trace.height;
		const data = ctx.getImageData(0, 0, traceW, traceH).data;
		const width = traceW + 2;
		const height = traceH + 2;
		const inside = new Uint8Array(width * height);
		let covered = 0;
		for (let y = 0; y < traceH; y++) {
			for (let x = 0; x < traceW; x++) {
				const on = data[(y * traceW + x) * 4 + 3] >= ALPHA_CUTOFF ? 1 : 0;
				inside[(y + 1) * width + x + 1] = on;
				covered += on;
			}
		}
		if (covered >= traceW * traceH * 0.995) return rectangle();

		const rings = traceContours(inside, width, height)
			.map((points) => simplify(points, SIMPLIFY_TOLERANCE))
			.filter((points) => points.length >= 6 && ringArea(points) >= MIN_AREA)
			.map((points) => ({ points, area: ringArea(points), depth: 0 }))
			.sort((a, b) => b.area - a.area)
			.slice(0, MAX_CONTOURS);
		if (!rings.length) return rectangle();

		for (const ring of rings) {
			for (const other of rings) {
				if (
					other !== ring &&
					other.area > ring.area &&
					ringContains(other.points, ring.points[0], ring.points[1])
				) {
					ring.depth += 1;
				}
			}
		}

		const toShapeSpace = (points: number[]) => {
			const out: number[] = [];
			for (let i = 0; i < points.length; i += 2) {
				out.push(
					((points[i] - 0.5) / traceW) * aspectW,
					(1 - (points[i + 1] - 0.5) / traceH) * aspectH
				);
			}
			return out;
		};

		const shapes = new Map<(typeof rings)[number], ShapeRings>();
		for (const ring of rings) {
			if (ring.depth % 2 === 0) shapes.set(ring, { outer: toShapeSpace(ring.points), holes: [] });
		}
		for (const ring of rings) {
			if (ring.depth % 2 === 0) continue;
			let parent: (typeof rings)[number] | null = null;
			for (const other of rings) {
				if (other.depth !== ring.depth - 1) continue;
				if (!ringContains(other.points, ring.points[0], ring.points[1])) continue;
				if (!parent || other.area < parent.area) parent = other;
			}
			const shape = parent ? shapes.get(parent) : undefined;
			if (shape) shape.holes.push(toShapeSpace(ring.points));
		}
		const result = [...shapes.values()];
		return result.length ? result : rectangle();
	}

	function compile(gl: WebGL2RenderingContext, vertex: string, fragment: string) {
		const program = gl.createProgram();
		for (const [type, source] of [
			[gl.VERTEX_SHADER, vertex],
			[gl.FRAGMENT_SHADER, fragment]
		] as const) {
			const shader = gl.createShader(type);
			if (!shader) throw new Error('Could not create shader');
			gl.shaderSource(shader, `#version 300 es\nprecision highp float;\n${source}`);
			gl.compileShader(shader);
			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
				throw new Error(gl.getShaderInfoLog(shader) ?? 'Shader compile failed');
			}
			gl.attachShader(program, shader);
			gl.deleteShader(shader);
		}
		gl.bindAttribLocation(program, 0, 'position');
		gl.bindAttribLocation(program, 1, 'normal');
		gl.bindAttribLocation(program, 2, 'uv');
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			throw new Error(gl.getProgramInfoLog(program) ?? 'Program link failed');
		}
		const uniforms: Record<string, WebGLUniformLocation | null> = {};
		const location = (name: string) => {
			if (!(name in uniforms)) uniforms[name] = gl.getUniformLocation(program, name);
			return uniforms[name];
		};
		return { program, location };
	}

	function createTexture(
		gl: WebGL2RenderingContext,
		internalFormat: number,
		format: number,
		width: number,
		height: number,
		filter: number,
		data: ArrayBufferView | null = null
	) {
		const texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
		gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, gl.UNSIGNED_BYTE, data);
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		return texture;
	}

	export function createDitheredObject(
		elements: DitheredObjectElements,
		options: DitheredObjectOptions = {}
	): DitheredObjectInstance | null {
		const { canvas } = elements;
		const config: Required<DitheredObjectOptions> = { ...DEFAULTS, ...options };

		const context = canvas.getContext('webgl2', {
			alpha: true,
			antialias: false,
			depth: false,
			premultipliedAlpha: true,
			powerPreference: 'high-performance'
		});
		if (!context) return null;
		const gl = context;

		let meshProgram: ReturnType<typeof compile>;
		let postProgram: ReturnType<typeof compile>;
		let levelProgram: ReturnType<typeof compile>;
		try {
			meshProgram = compile(gl, MESH_VERT, MESH_FRAG);
			postProgram = compile(gl, POST_VERT, POST_FRAG);
			levelProgram = compile(gl, POST_VERT, LEVEL_FRAG);
		} catch {
			return null;
		}

		const anisotropy = gl.getExtension('EXT_texture_filter_anisotropic');
		const maxAnisotropy = anisotropy
			? (gl.getParameter(anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT) as number)
			: 1;
		const samples = Math.min(4, gl.getParameter(gl.MAX_SAMPLES) as number);

		// Fullscreen triangle shared by the post and level passes.
		const quadVao = gl.createVertexArray();
		const quadBuffer = gl.createBuffer();
		gl.bindVertexArray(quadVao);
		gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
		gl.bindVertexArray(null);

		// Scene pass: render multisampled, then resolve into a texture the post pass samples.
		const scene = {
			width: 0,
			height: 0,
			msaaFbo: gl.createFramebuffer(),
			color: gl.createRenderbuffer(),
			depth: gl.createRenderbuffer(),
			resolveFbo: gl.createFramebuffer(),
			texture: null as WebGLTexture | null
		};

		function resizeScene(width: number, height: number) {
			if (scene.width === width && scene.height === height) return;
			scene.width = width;
			scene.height = height;
			gl.bindRenderbuffer(gl.RENDERBUFFER, scene.color);
			gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.SRGB8_ALPHA8, width, height);
			gl.bindRenderbuffer(gl.RENDERBUFFER, scene.depth);
			gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH_COMPONENT24, width, height);
			gl.bindFramebuffer(gl.FRAMEBUFFER, scene.msaaFbo);
			gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, scene.color);
			gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, scene.depth);
			gl.deleteTexture(scene.texture);
			scene.texture = createTexture(gl, gl.SRGB8_ALPHA8, gl.RGBA, width, height, gl.LINEAR);
			gl.bindFramebuffer(gl.FRAMEBUFFER, scene.resolveFbo);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, scene.texture, 0);
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		}

		const diffusion = {
			fbo: gl.createFramebuffer(),
			target: null as WebGLTexture | null,
			mask: null as WebGLTexture | null,
			buffer: gl.createBuffer(),
			sync: null as WebGLSync | null,
			syncGeneration: 0,
			pixels: new Uint8Array(0),
			maskData: new Uint8Array(0),
			rows: [new Float32Array(0), new Float32Array(0)] as [Float32Array, Float32Array],
			width: 0,
			height: 0,
			generation: 0,
			ready: false
		};

		const post = {
			resolution: [1, 1] as [number, number],
			gridSize: 4,
			pixelSizeRatio: 1,
			grayscale: 1,
			invert: 0,
			dither: 1,
			method: 0
		};

		// Camera orbits the origin; the spherical delta and damping mirror three's OrbitControls.
		const camera = {
			position: CAMERA_DIR.map((c) => c * config.cameraDistance) as Vec3,
			aspect: 1,
			theta: 0,
			phi: 0,
			deltaTheta: 0,
			deltaPhi: 0,
			zoom: 1
		};
		const DAMPING = 0.05;

		function updateCamera() {
			const [x, y, z] = camera.position;
			let radius = Math.hypot(x, y, z) || 1e-6;
			let theta = Math.atan2(x, z);
			let phi = Math.acos(Math.min(Math.max(y / radius, -1), 1));
			if (config.autoRotate && !reducedMotion && !drag) {
				camera.deltaTheta -= ((2 * Math.PI) / 60 / 60) * config.autoRotateSpeed;
			}
			theta += camera.deltaTheta * DAMPING;
			phi += camera.deltaPhi * DAMPING;
			phi = Math.min(Math.max(phi, 1e-6), Math.PI - 1e-6);
			radius *= camera.zoom;
			camera.zoom = 1;
			camera.deltaTheta *= 1 - DAMPING;
			camera.deltaPhi *= 1 - DAMPING;
			camera.position = [
				radius * Math.sin(phi) * Math.sin(theta),
				radius * Math.cos(phi),
				radius * Math.sin(phi) * Math.cos(theta)
			];
		}

		const pointers: Array<{ id: number; x: number; y: number }> = [];
		let drag = false;
		let pinchDistance = 0;

		function pinchSpan() {
			const [a, b] = pointers;
			return Math.hypot(a.x - b.x, a.y - b.y);
		}

		function onPointerDown(event: PointerEvent) {
			if (!config.orbit && !config.zoom) return;
			canvas.setPointerCapture(event.pointerId);
			pointers.push({ id: event.pointerId, x: event.clientX, y: event.clientY });
			drag = true;
			if (pointers.length === 2) pinchDistance = pinchSpan();
		}

		function onPointerMove(event: PointerEvent) {
			const pointer = pointers.find((p) => p.id === event.pointerId);
			if (!pointer) return;
			const previous = { x: pointer.x, y: pointer.y };
			const current = { x: event.clientX, y: event.clientY };
			Object.assign(pointer, current);
			if (pointers.length === 1 && config.orbit) {
				const height = canvas.clientHeight || 1;
				camera.deltaTheta -= (2 * Math.PI * (current.x - previous.x)) / height;
				camera.deltaPhi -= (2 * Math.PI * (current.y - previous.y)) / height;
			} else if (pointers.length === 2 && config.zoom) {
				const span = pinchSpan();
				if (pinchDistance > 0 && span > 0) camera.zoom *= pinchDistance / span;
				pinchDistance = span;
			}
		}

		function onPointerUp(event: PointerEvent) {
			const index = pointers.findIndex((p) => p.id === event.pointerId);
			if (index >= 0) pointers.splice(index, 1);
			if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
			drag = pointers.length > 0;
			pinchDistance = pointers.length === 2 ? pinchSpan() : 0;
		}

		function onWheel(event: WheelEvent) {
			if (!config.zoom) return;
			event.preventDefault();
			const scale = Math.pow(0.95, Math.abs(event.deltaY * 0.01));
			camera.zoom *= event.deltaY < 0 ? scale : 1 / scale;
		}

		function onContextMenu(event: Event) {
			if (config.orbit || config.zoom) event.preventDefault();
		}

		canvas.addEventListener('pointerdown', onPointerDown);
		canvas.addEventListener('pointermove', onPointerMove);
		canvas.addEventListener('pointerup', onPointerUp);
		canvas.addEventListener('pointercancel', onPointerUp);
		canvas.addEventListener('wheel', onWheel, { passive: false });
		canvas.addEventListener('contextmenu', onContextMenu);

		interface Model {
			vao: WebGLVertexArrayObject;
			buffers: WebGLBuffer[];
			texture: WebGLTexture;
			count: number;
			center: Vec3;
			maxDim: number;
		}

		let model: Model | null = null;
		let loadedSrc: string | null = null;
		let loadToken = 0;
		let disposed = false;

		function clearModel() {
			if (!model) return;
			gl.deleteVertexArray(model.vao);
			for (const buffer of model.buffers) gl.deleteBuffer(buffer);
			gl.deleteTexture(model.texture);
			model = null;
		}

		function createModel(canvasSource: HTMLCanvasElement): Model {
			const longest = Math.max(canvasSource.width, canvasSource.height, 1);
			const aspectW = canvasSource.width / longest;
			const aspectH = canvasSource.height / longest;
			const geometry = extrude(buildShapes(canvasSource, aspectW, aspectH), aspectW, aspectH);

			const vao = gl.createVertexArray();
			gl.bindVertexArray(vao);
			const buffers = [geometry.positions, geometry.normals, geometry.uvs].map((data, index) => {
				const buffer = gl.createBuffer();
				gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
				gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
				gl.enableVertexAttribArray(index);
				gl.vertexAttribPointer(index, index === 2 ? 2 : 3, gl.FLOAT, false, 0, 0);
				return buffer;
			});
			gl.bindVertexArray(null);

			const texture = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, canvasSource);
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
			gl.generateMipmap(gl.TEXTURE_2D);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			if (anisotropy) {
				gl.texParameterf(gl.TEXTURE_2D, anisotropy.TEXTURE_MAX_ANISOTROPY_EXT, maxAnisotropy);
			}

			return {
				vao,
				buffers,
				texture,
				count: geometry.count,
				center: geometry.center,
				maxDim: geometry.maxDim
			};
		}

		async function loadAsset() {
			const src = config.src;
			if (src === loadedSrc) return;
			loadedSrc = src;
			const token = ++loadToken;
			if (!src) {
				clearModel();
				return;
			}
			try {
				const response = await fetch(src);
				if (!response.ok) throw new Error(`HTTP ${response.status}`);
				const buffer = await response.arrayBuffer();
				if (disposed || token !== loadToken) return;
				const kind = sniffKind(new Uint8Array(buffer));
				if (!kind) throw new Error('Unrecognized asset format');
				const blob = new Blob([buffer], { type: kind === 'svg' ? 'image/svg+xml' : '' });
				const source = await decodeImage(blob, kind);
				if (disposed || token !== loadToken) return;
				clearModel();
				model = createModel(source);
				config.onLoad?.();
			} catch (error) {
				if (disposed || token !== loadToken) return;
				config.onError?.(error);
			}
		}

		const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
		let reducedMotion = motionQuery.matches;
		const onMotionChange = () => {
			reducedMotion = motionQuery.matches;
			if (reducedMotion) floatRotation = [0, 0, 0];
			applyOptions();
		};
		motionQuery.addEventListener('change', onMotionChange);

		function releaseDiffusion() {
			if (diffusion.sync) gl.deleteSync(diffusion.sync);
			diffusion.sync = null;
			gl.deleteTexture(diffusion.target);
			gl.deleteTexture(diffusion.mask);
			diffusion.target = null;
			diffusion.mask = null;
		}

		function methodIndex() {
			const index = METHOD_INDEX[config.method] ?? 0;
			return index === 2 && !diffusion.ready ? 0 : index;
		}

		function resizeDiffusion(width: number, height: number) {
			if (diffusion.target && diffusion.width === width && diffusion.height === height) return;
			releaseDiffusion();
			diffusion.width = width;
			diffusion.height = height;
			diffusion.generation += 1;
			diffusion.ready = false;
			diffusion.target = createTexture(gl, gl.RGBA8, gl.RGBA, width, height, gl.NEAREST);
			gl.bindFramebuffer(gl.FRAMEBUFFER, diffusion.fbo);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, diffusion.target, 0);
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			diffusion.pixels = new Uint8Array(width * height * 4);
			diffusion.maskData = new Uint8Array(width * height);
			diffusion.mask = createTexture(gl, gl.R8, gl.RED, width, height, gl.NEAREST, diffusion.maskData);
			diffusion.rows = [new Float32Array(width + 2), new Float32Array(width + 2)];
			gl.bindBuffer(gl.PIXEL_PACK_BUFFER, diffusion.buffer);
			gl.bufferData(gl.PIXEL_PACK_BUFFER, diffusion.pixels.byteLength, gl.STREAM_READ);
			gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
			post.method = methodIndex();
		}

		/** Collect the previous async readback (if the GPU is done), then queue the next one. */
		function updateDiffusion() {
			if (diffusion.sync) {
				const status = gl.clientWaitSync(diffusion.sync, 0, 0);
				if (status === gl.TIMEOUT_EXPIRED) return;
				gl.deleteSync(diffusion.sync);
				diffusion.sync = null;
				if (status !== gl.WAIT_FAILED && diffusion.syncGeneration === diffusion.generation) {
					const { width, height, pixels, maskData } = diffusion;
					gl.bindBuffer(gl.PIXEL_PACK_BUFFER, diffusion.buffer);
					gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, pixels);
					gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
					diffuse(pixels, maskData, diffusion.rows, width, height);
					gl.bindTexture(gl.TEXTURE_2D, diffusion.mask);
					gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
					gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, gl.RED, gl.UNSIGNED_BYTE, maskData);
					gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
					if (!diffusion.ready) {
						diffusion.ready = true;
						post.method = methodIndex();
					}
				}
			}

			resizeDiffusion(
				Math.max(Math.ceil(post.resolution[0] / post.gridSize), 1),
				Math.max(Math.ceil(post.resolution[1] / post.gridSize), 1)
			);
			gl.bindFramebuffer(gl.FRAMEBUFFER, diffusion.fbo);
			gl.viewport(0, 0, diffusion.width, diffusion.height);
			gl.useProgram(levelProgram.program);
			bindSceneTexture(levelProgram);
			gl.uniform2f(levelProgram.location('uResolution'), ...post.resolution);
			gl.uniform1f(levelProgram.location('uGridSize'), post.gridSize);
			gl.uniform1f(levelProgram.location('uPixelSizeRatio'), post.pixelSizeRatio);
			gl.bindVertexArray(quadVao);
			gl.drawArrays(gl.TRIANGLES, 0, 3);

			gl.bindBuffer(gl.PIXEL_PACK_BUFFER, diffusion.buffer);
			gl.readPixels(0, 0, diffusion.width, diffusion.height, gl.RGBA, gl.UNSIGNED_BYTE, 0);
			gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
			diffusion.sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
			diffusion.syncGeneration = diffusion.generation;
		}

		function bindSceneTexture(target: ReturnType<typeof compile>) {
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, scene.texture);
			gl.uniform1i(target.location('tDiffuse'), 0);
		}

		let pixelRatio = 1;
		let clearColor: [number, number, number, number] = [0, 0, 0, 0];
		let ringColor: Vec3 = [0, 0, 0];

		function applyOptions() {
			clearColor = config.background ? parseColor(config.background) : [0, 0, 0, 0];
			const [r, g, b] = parseColor(config.highlight);
			ringColor = [r * RING_INTENSITY, g * RING_INTENSITY, b * RING_INTENSITY];
			post.gridSize = Math.max(config.gridSize, 1) * pixelRatio;
			post.pixelSizeRatio = Math.max(config.pixelSizeRatio, 1);
			post.grayscale = config.grayscale ? 1 : 0;
			post.invert = config.invert ? 1 : 0;
			post.dither = config.dither ? 1 : 0;
			post.method = methodIndex();
		}

		function resize() {
			const width = Math.max(canvas.clientWidth, 1);
			const height = Math.max(canvas.clientHeight, 1);
			pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
			canvas.width = Math.floor(width * pixelRatio);
			canvas.height = Math.floor(height * pixelRatio);
			const pixelSize = config.dither
				? Math.max(config.gridSize, 1) * Math.max(config.pixelSizeRatio, 1) * pixelRatio
				: 1;
			const targetScale = Math.min(1, 2 / pixelSize);
			resizeScene(
				Math.max(Math.round(width * pixelRatio * targetScale), 1),
				Math.max(Math.round(height * pixelRatio * targetScale), 1)
			);
			post.resolution = [Math.round(width * pixelRatio), Math.round(height * pixelRatio)];
			post.gridSize = Math.max(config.gridSize, 1) * pixelRatio;
			camera.aspect = width / height;
		}

		const observer = new ResizeObserver(resize);
		observer.observe(canvas);
		resize();
		applyOptions();
		loadAsset();

		let floatRotation: Vec3 = [0, 0, 0];
		let floatY = MODEL_LIFT + config.yOffset;

		function renderScene() {
			gl.bindFramebuffer(gl.FRAMEBUFFER, scene.msaaFbo);
			gl.viewport(0, 0, scene.width, scene.height);
			gl.clearColor(...clearColor);
			gl.clearDepth(1);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

			if (model) {
				const view = lookAt(camera.position);
				const viewProjection = multiply(perspective(config.fov, camera.aspect, 0.1, 200), view);
				const modelMat = modelMatrix(
					[config.xOffset, floatY, 0],
					floatRotation,
					config.scale / model.maxDim,
					model.center
				);
				// Uniform scale, so the normal matrix is the normalized rotation part.
				const s = config.scale / model.maxDim;
				const normalMatrix = new Float32Array([
					modelMat[0] / s, modelMat[1] / s, modelMat[2] / s,
					modelMat[4] / s, modelMat[5] / s, modelMat[6] / s,
					modelMat[8] / s, modelMat[9] / s, modelMat[10] / s
				]);
				const sh = new Float32Array(27);
				for (let i = 0; i < 9; i++) {
					for (let c = 0; c < 3; c++) sh[i * 3 + c] = ROOM_SH[i] + RING_SH[i] * ringColor[c];
				}

				gl.enable(gl.DEPTH_TEST);
				gl.useProgram(meshProgram.program);
				gl.uniformMatrix4fv(meshProgram.location('uModel'), false, modelMat);
				gl.uniformMatrix4fv(meshProgram.location('uViewProjection'), false, viewProjection);
				gl.uniformMatrix3fv(meshProgram.location('uNormalMatrix'), false, normalMatrix);
				gl.uniform3fv(meshProgram.location('uSH'), sh);
				gl.uniform3f(meshProgram.location('uCameraPosition'), ...camera.position);
				gl.uniform1f(meshProgram.location('uEnvIntensity'), config.environmentIntensity);
				gl.uniform1f(
					meshProgram.location('uRoughness'),
					config.roughness >= 0 ? config.roughness : BASE_ROUGHNESS
				);
				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, model.texture);
				gl.uniform1i(meshProgram.location('uMap'), 0);
				gl.bindVertexArray(model.vao);
				gl.drawArrays(gl.TRIANGLES, 0, model.count);
				gl.disable(gl.DEPTH_TEST);
			}

			gl.bindFramebuffer(gl.READ_FRAMEBUFFER, scene.msaaFbo);
			gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, scene.resolveFbo);
			gl.blitFramebuffer(
				0, 0, scene.width, scene.height,
				0, 0, scene.width, scene.height,
				gl.COLOR_BUFFER_BIT, gl.NEAREST
			);
			gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
			gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
		}

		function renderPost() {
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.viewport(0, 0, canvas.width, canvas.height);
			gl.useProgram(postProgram.program);
			bindSceneTexture(postProgram);
			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gl.TEXTURE_2D, diffusion.mask);
			gl.uniform1i(postProgram.location('tMask'), 1);
			gl.uniform2f(postProgram.location('uResolution'), ...post.resolution);
			gl.uniform1f(postProgram.location('uGridSize'), post.gridSize);
			gl.uniform1f(postProgram.location('uPixelSizeRatio'), post.pixelSizeRatio);
			gl.uniform1f(postProgram.location('uGrayscale'), post.grayscale);
			gl.uniform1f(postProgram.location('uInvert'), post.invert);
			gl.uniform1f(postProgram.location('uDither'), post.dither);
			gl.uniform1i(postProgram.location('uMethod'), post.method);
			gl.bindVertexArray(quadVao);
			gl.drawArrays(gl.TRIANGLES, 0, 3);
			gl.activeTexture(gl.TEXTURE0);
		}

		let inView = true;
		let frame = 0;
		let lastTime = 0;
		let elapsed = Math.random() * 100;

		function tick(time: number) {
			frame = 0;
			if (!inView || disposed) {
				lastTime = 0;
				return;
			}
			frame = requestAnimationFrame(tick);
			const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 0;
			lastTime = time;
			updateCamera();

			if (!reducedMotion) {
				elapsed += delta * config.floatSpeed;
				floatRotation = [
					(Math.cos(elapsed / 4) / 8) * config.rotationIntensity,
					(Math.sin(elapsed / 4) / 8) * config.rotationIntensity,
					(Math.sin(elapsed / 4) / 20) * config.rotationIntensity
				];
				floatY =
					MODEL_LIFT + config.yOffset + (Math.sin(elapsed / 1.5) / 10) * config.floatIntensity;
			} else {
				floatY = MODEL_LIFT + config.yOffset;
			}

			renderScene();
			if (config.dither && config.method === 'floyd') updateDiffusion();
			renderPost();
		}

		function startLoop() {
			if (frame || !inView || disposed) return;
			frame = requestAnimationFrame(tick);
		}

		function stopLoop() {
			if (!frame) return;
			cancelAnimationFrame(frame);
			frame = 0;
			lastTime = 0;
		}

		const viewObserver =
			typeof IntersectionObserver !== 'undefined'
				? new IntersectionObserver((entries) => {
						inView = entries[entries.length - 1]?.isIntersecting ?? true;
						if (inView) startLoop();
						else stopLoop();
					})
				: null;
		viewObserver?.observe(canvas);

		startLoop();

		return {
			setOptions(next: DitheredObjectOptions) {
				let changed = false;
				for (const [key, value] of Object.entries(next)) {
					if (typeof value === 'function') continue;
					if (config[key as keyof DitheredObjectOptions] !== value) {
						changed = true;
						break;
					}
				}
				if (!changed) {
					Object.assign(config, next);
					return;
				}

				const previousDistance = config.cameraDistance;
				Object.assign(config, next);
				if (config.cameraDistance !== previousDistance) {
					camera.position = CAMERA_DIR.map((c) => c * config.cameraDistance) as Vec3;
				}
				resize();
				applyOptions();
				loadAsset();
				startLoop();
			},
			resize,
			destroy() {
				disposed = true;
				loadToken += 1;
				stopLoop();
				observer.disconnect();
				viewObserver?.disconnect();
				motionQuery.removeEventListener('change', onMotionChange);
				canvas.removeEventListener('pointerdown', onPointerDown);
				canvas.removeEventListener('pointermove', onPointerMove);
				canvas.removeEventListener('pointerup', onPointerUp);
				canvas.removeEventListener('pointercancel', onPointerUp);
				canvas.removeEventListener('wheel', onWheel);
				canvas.removeEventListener('contextmenu', onContextMenu);
				clearModel();
				releaseDiffusion();
				gl.deleteTexture(scene.texture);
				for (const fbo of [scene.msaaFbo, scene.resolveFbo, diffusion.fbo]) gl.deleteFramebuffer(fbo);
				gl.deleteRenderbuffer(scene.color);
				gl.deleteRenderbuffer(scene.depth);
				gl.deleteBuffer(diffusion.buffer);
				gl.deleteBuffer(quadBuffer);
				gl.deleteVertexArray(quadVao);
				for (const { program } of [meshProgram, postProgram, levelProgram]) gl.deleteProgram(program);
			}
		};
	}
</script>

<script lang="ts">
	import { onMount } from 'svelte';

	interface Props extends DitheredObjectOptions {
		class?: string;
	}

	let { class: className = '', ...options }: Props = $props();

	let canvasEl = $state<HTMLCanvasElement>()!;
	let instance: DitheredObjectInstance | null = null;

	onMount(() => {
		instance = createDitheredObject({ canvas: canvasEl }, options);
		return () => {
			instance?.destroy();
			instance = null;
		};
	});

	$effect(() => {
		instance?.setOptions({ ...options });
	});
</script>

<div class={className} style="position: relative;">
	<canvas
		bind:this={canvasEl}
		style="position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: none;"
	></canvas>
</div>
