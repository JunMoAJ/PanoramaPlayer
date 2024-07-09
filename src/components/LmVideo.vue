<template>
  <div class="lm-video" ref="lmVideoRef">
    <video :id="props.id" class="lm-video-dom video-js vjs-default-skin"></video>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref, reactive } from "vue";
import * as THREE from "three";
import "video.js/dist/video-js.css";
import videojs from "video.js";

const props = withDefaults(defineProps<{
  id: string;
  url: string;
  options: {
    controls?: boolean;
    autoplay?: boolean;
    muted?: boolean;
    preload?: "auto" | "metadata" | "none";
    [x: string]: any;
  };
  is360?: boolean;
}>(), {
  options: {
    controls: true,
    autoplay: false,
    muted: false,
    preload: "auto"
  },
  is360: false
});

const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, .25, 10 );
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer();
const t = reactive({
  isUserInteracting: false,
  lon: 0,
  lat: 0,
  phi: 0,
  theta: 0,
  onPointerDownPointerX: 0,
  onPointerDownPointerY: 0,
  onPointerDownLon: 0,
  onPointerDownLat: 0,
  distance: 0.5
});

const lmVideoRef = ref();

const player = ref();

const animate = () => {
  // 限制球面坐标的范围，获取纬度
  t.lat = Math.max(-85, Math.min(85, t.lat ));
  // 将纬度t.lat从度转换为弧度俯仰角, 由于在球面坐标系中，纬度是从赤道（0度）到极点（90度或-90度），而phi是从顶点（0）到赤道（π/2），所以需要从90度减去纬度来得到正确的phi值
  t.phi = THREE.MathUtils.degToRad(90 - t.lat);
  // 将经度t.lon从度转换为弧度偏航角
  t.theta = THREE.MathUtils.degToRad(t.lon);
  /**
   * 将球面坐标转为笛卡尔坐标
   * r = 到原点的距离（半径）
   * phi = 俯仰角（弧度）
   * theta = 偏航角(弧度)
   * x = r * sin(phi) * cos(theta)
   * y = r * cos(phi)
   * z = r * sin(phi) * sin(theta)
   */
  camera.position.x = t.distance * Math.sin(t.phi) * Math.cos(t.theta);
  camera.position.y = t.distance * Math.cos(t.phi);
  camera.position.z = t.distance * Math.sin(t.phi) * Math.sin(t.theta);
  // 相机锁定在原点
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera );
};

const onPointerDown = (event) => {
  t.isUserInteracting = true;

  t.onPointerDownPointerX = event.clientX;
  t.onPointerDownPointerY = event.clientY;

  t.onPointerDownLon = t.lon;
  t.onPointerDownLat = t.lat;
};

const onPointerMove = (event) => {
  if (t.isUserInteracting === true) {
    // 根据移动的距离计算相机的偏移量。0.1为缩放因子，越小越慢，避免操作过于灵敏。
    t.lon = ( t.onPointerDownPointerX - event.clientX ) * 0.1 + t.onPointerDownLon;
    t.lat = ( t.onPointerDownPointerY - event.clientY ) * 0.1 + t.onPointerDownLat;
  }
};

const onPointerUp = () => {
  t.isUserInteracting = false;
};

const onWindowResize = () => {
  const container = document.getElementById(props.id) as HTMLVideoElement;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(container.clientWidth, container.clientHeight);
};

const created360Video = () => {
  const container = document.getElementById(props.id) as HTMLVideoElement;
  const video = document.getElementById(`${props.id}_html5_api`) as HTMLVideoElement;
  if (!video) return;
  video.style.display = "none";
  // 默认设置为视频的第一秒。
  video.currentTime = 0;
  const geometry = new THREE.SphereGeometry(5, 60, 40);
  // three中x正值为右手边，负值为左手边，这里进行x轴翻转，让球体背面变为球体正面，和360视频纹理一致
  geometry.scale(-1, 1, 1);
  const texture = new THREE.VideoTexture(video);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: texture });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setAnimationLoop(animate);
  renderer.domElement.class = "vjs-tech";
  container.appendChild(renderer.domElement);
  lmVideoRef.value.addEventListener("pointerdown", onPointerDown);
  lmVideoRef.value.addEventListener("pointermove", onPointerMove);
  lmVideoRef.value.addEventListener("pointerup", onPointerUp);
  window.addEventListener("resize", onWindowResize);
}



onMounted(() => {
  // .mu3u8格式的type需要设置"application/x-mpegURL"
  player.value = videojs(props.id, {
    ...props.options,
    html5: {
      hls: {
        withCredentials: true
      }
    },
    sources: [{ src: props.url, type: props.url.endsWith(".mu3u8") ? "application/x-mpegURL" : "" }],
  });
  if (props.is360) {
    created360Video();
  }
});
</script>
<style scoped>
.lm-video {
  width: 100%;
  height: 100%;
}
.lm-video-dom {
  width: 100%;
  height: 100%;
}
/deep/ .vjs-big-play-button {
  width: 2em !important;
  height: 2em !important;
  border-radius: 50% !important;
  line-height: 1.9em !important;
}
/deep/ .vjs-paused.vjs-has-started .vjs-big-play-button {
  display: block !important;
}

/deep/ .video-js .vjs-time-control {
  display: block !important;
}

/deep/ .video-js .vjs-remaining-time {
  display: block !important;
}
</style>