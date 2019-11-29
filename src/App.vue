<template>
  <div id="box" :style="boxStyle">
    <span id="edit" v-show="editVisible" :style="editStyle"></span>
  </div>
</template>

<script>
import { fromEvent, merge } from "rxjs";
import {
  // throttleTime,
  map,
  // scan,
  switchMap,
  takeUntil,
  tap,
  filter
  // tap
} from "rxjs/operators";

const getAngle = ({ x: x1, y: y1 }, { x: x2, y: y2 }) => {
  const dot = x1 * x2 + y1 * y2;
  const det = x1 * y2 - y1 * x2;
  const angle = (Math.atan2(det, dot) / Math.PI) * 180;
  return (angle + 360) % 360;
};

const getDistance = vector => {
  return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
};
// const getScale = ({ x: x1, y: y1 }, { x: x2, y: y2 }) => {
//   const distance1 = Math.sqrt(x1 * x1 + y1 + y1);
//   const distance2 = Math.sqrt(x2 * x2 + y2 + y2);
//   if (!distance1) {
//     return 1;
//   }
//   return distance2 / distance1;
// };

// function getTranslate(element) {
//   const style = getComputedStyle(element);
//   const result = style.transform.slice(7, -1).split(", ");

//   if (result) {
//     return {
//       x: parseInt(result[4], 10),
//       y: parseInt(result[5], 10)
//     };
//   }
// }

const getVector = e => {
  let e0 = e.targetTouches[0];
  let e1 = e.targetTouches[1];
  return {
    x: e0.clientX - e1.clientX,
    y: e0.clientY - e1.clientY
  };
};

export default {
  data() {
    return {
      editVisible: true,
      rotateAngle: 0,
      scale: 1,
      pos: {
        x: 10,
        y: 10
      }
    };
  },
  computed: {
    boxStyle() {
      const { rotateAngle, pos } = this;
      const { scale } = this;

      return `transform: translate(${pos.x}px, ${pos.y}px) rotate(${rotateAngle}deg) scale(${scale});`;
    },
    editStyle() {
      const { scale } = this;
      return `transform:scale(${1 / scale})`;
    }
  },
  mounted() {
    const box = document.getElementById("box");
    const edit = document.getElementById("edit");

    const mouseDown$ = merge(
      fromEvent(box, "mousedown"),
      fromEvent(box, "touchstart")
    );

    const mouseMove$ = merge(
      fromEvent(document, "mousemove"),
      fromEvent(document, "touchmove")
    );
    const mouseUp$ = merge(
      fromEvent(document, "mouseup"),
      fromEvent(document, "touchend")
    );

    const scaleStart$ = fromEvent(document, "touchstart");

    const selectEdit$ = merge(
      fromEvent(edit, "mousedown"),
      fromEvent(edit, "touchstart")
    );

    scaleStart$
      .pipe(
        filter(e => {
          return e.targetTouches && e.targetTouches.length > 1;
        }),
        map(e => {
          return {
            startVector: getVector(e),
            scale: this.scale
          };
        }),
        switchMap(({ startVector, scale }) => {
          return mouseMove$.pipe(
            filter(e => {
              return (
                e.type === "touchmove" &&
                e.targetTouches &&
                e.targetTouches.length > 1
              );
            }),
            map(e => {
              const moveVector = getVector(e);
              return (
                (getDistance(moveVector) / getDistance(startVector)) * scale
              );
            }),
            takeUntil(mouseUp$)
          );
        })
      )
      .subscribe(scale => {
        this.scale = scale;
        // const { rotateAngle, pos } = this;
        // box.style.transform = `translate(${pos.x}px, ${pos.y}px) rotate(${rotateAngle}deg) scale(${scale})`;
        // edit.style.transform = `scale(${1 / scale})`;
      });

    mouseDown$
      .pipe(
        map(event => ({
          pos: this.pos,
          event
        })),
        switchMap(initialState => {
          const initialPos = initialState.pos;
          let e = initialState.event;

          if (e.type === "touchstart") {
            e = e.targetTouches[0];
          }
          let { clientX, clientY } = e;
          return mouseMove$.pipe(
            map(moveEvent => {
              let e = moveEvent;
              if (e.type === "touchmove") {
                e = e.targetTouches[0];
              }
              return {
                x: e.clientX - clientX + initialPos.x,
                y: e.clientY - clientY + initialPos.y
              };
            }),
            takeUntil(mouseUp$)
          );
        })
      )
      .subscribe(pos => {
        this.pos = pos;
        // const { rotateAngle, scale } = this;

        // box.style.transform = `translate(${pos.x}px, ${pos.y}px) rotate(${rotateAngle}deg) scale(${scale})`;
      });

    const distance = getDistance({
      x: 20,
      y: 40
    });

    selectEdit$
      .pipe(
        map(e => {
          if (e.stopPropagation) e.stopPropagation();
          if (e.preventDefault) e.preventDefault();
          if (e.type === "touchstart") {
            e = e.targetTouches[0];
          }
          const { clientX, clientY } = e;
          const rect = box.getBoundingClientRect();
          const center = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
          };
          this.editVisible = false;
          return {
            // startVector,
            center,
            clientX,
            clientY,
            // prevDistance: this.distance,
            rotateAngle: this.rotateAngle
          };
        }),
        switchMap(({ center, clientX, clientY, rotateAngle }) => {
          const startVector = {
            x: clientX - center.x,
            y: clientY - center.y
          };
          return mouseMove$.pipe(
            map(moveEvent => {
              let e = moveEvent;
              if (e.type === "touchmove") {
                e = e.targetTouches[0];
              }
              const { clientX, clientY } = e;
              const rotateVector = {
                x: clientX - center.x,
                y: clientY - center.y
              };
              const angle = getAngle(startVector, rotateVector) + rotateAngle;
              const scale = getDistance(rotateVector) / distance;
              return {
                scale,
                rotateAngle: angle
              };
            }),
            takeUntil(
              mouseUp$.pipe(
                tap(() => {
                  this.editVisible = true;
                })
              )
            )
          );
        })
      )
      .subscribe(({ rotateAngle, scale }) => {
        // 然后保存为之前的角度
        this.rotateAngle = rotateAngle;
        if (scale < 1) {
          scale = 1;
        }
        this.scale = scale;
        // const { pos } = this;
        // box.style.transform = `translate(${pos.x}px, ${pos.y}px) rotate(${rotateAngle}deg) scale(${scale})`;
        // edit.style.transform = `scale(${1 / scale})`;
      });
  },
  methods: {}
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style>
body {
  overflow: hidden;
}
</style>
<style scoped>
#box {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(10px, 10px);
  /* transition: 0.05s transform ease-out; */
  width: 80px;
  height: 40px;
  background: orange;
  border: 0;
  cursor: pointer;
}
#edit {
  position: absolute;
  bottom: -10px;
  right: -10px;
  width: 20px;
  height: 20px;
  line-height: 20px;
  background-color: yellow;
  border-radius: 50%;
  z-index: 1;
}
</style>
