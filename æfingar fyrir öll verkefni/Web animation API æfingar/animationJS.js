document.querySelectorAll(".javascript-animation").forEach((element) => {
  element.addEventListener("click", () => {
    const sourceOpacity = 0;
    const targetOpacity = 1;
    const duration = 1000;
    let startTime;

    element.style.opacity = sourceOpacity;

    function step(time) {
      if (startTime === undefined) {
        startTime = time;
      }

      const progress = time - startTime;
      const factor = Math.min(progress / duration, 1);
      element.style.opacity =
        sourceOpacity + (targetOpacity - sourceOpacity) * factor;

      if (progress < duration) {
        window.requestAnimationFrame(step);
      }
    }

    window.requestAnimationFrame(step);
  });
});



const animations = new WeakMap();
const moved = new WeakMap();

document.querySelectorAll(".webanimapi").forEach((element) => {
  element.addEventListener("click", () => {
    const transformStart = getComputedStyle(element).transform;
    animations.get(element)?.cancel();

    const shouldMove = !moved.get(element);
    const transformEnd = shouldMove ? "translateX(100px)" : "translateX(0)";

    /* Web Animation API */
    const animation = element.animate(
      [{ transform: transformStart }, { transform: transformEnd }],
      {
        duration: 1000,
        easing: "linear",
        fill: "forwards",
      }
    );

    animations.set(element, animation);
    moved.set(element, shouldMove);
  });
});

const menuToggle = document.querySelector("#menuToggle");
const exerciseMenu = document.querySelector("#myLinks");

menuToggle.addEventListener("click", () => {
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isOpen));
  menuToggle.setAttribute(
    "aria-label",
    isOpen ? "Open exercises menu" : "Close exercises menu"
  );
  exerciseMenu.hidden = isOpen;
});