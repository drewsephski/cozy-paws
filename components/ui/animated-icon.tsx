'use client';

// Motion behavior is adapted from Lucide Animated by Dmytro (@pqoqubbw) (MIT):
// https://github.com/pqoqubbw/icons

import { motion, useAnimation, useReducedMotion, type Variants } from 'motion/react';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type ForwardRefExoticComponent,
  type RefAttributes,
  type RefObject,
  type SVGProps
} from 'react';

type IconElementName = 'circle' | 'ellipse' | 'line' | 'path' | 'polygon' | 'polyline' | 'rect';
export type IconNode = [elementName: IconElementName, attrs: Record<string, string>][];
export type IconMotion = 'down' | 'draw' | 'left' | 'pulse' | 'right' | 'rotate' | 'up' | 'up-right' | 'wiggle';
type InteractiveElement = HTMLElement | SVGElement;

export interface AnimatedIconProps extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
  absoluteStrokeWidth?: boolean;
  size?: number | string;
}

export type AnimatedLucideIcon = ForwardRefExoticComponent<
  Omit<AnimatedIconProps, 'ref'> & RefAttributes<SVGSVGElement>
>;

const INTERACTIVE_SELECTOR =
  'button, a, summary, label, [role="button"], [role="link"], [role="option"], [role="tab"]';

const DRAW_VARIANTS: Variants = {
  normal: {
    opacity: 1,
    pathLength: 1,
    pathOffset: 0,
    transition: { duration: 0.4 }
  },
  animate: {
    opacity: [0, 1],
    pathLength: [0, 1],
    pathOffset: [1, 0],
    transition: { duration: 0.6, ease: 'linear' }
  }
};

const MOTION_VARIANTS: Record<Exclude<IconMotion, 'draw'>, Variants> = {
  down: {
    normal: { y: 0 },
    animate: { y: [0, 2, 0], transition: { duration: 0.45, ease: 'easeInOut' } }
  },
  left: {
    normal: { x: 0 },
    animate: { x: [0, -2, 0], transition: { duration: 0.45, ease: 'easeInOut' } }
  },
  pulse: {
    normal: { scale: 1 },
    animate: { scale: [1, 1.12, 1], transition: { duration: 0.42, ease: 'easeInOut' } }
  },
  right: {
    normal: { x: 0 },
    animate: { x: [0, 2, 0], transition: { duration: 0.45, ease: 'easeInOut' } }
  },
  rotate: {
    normal: { rotate: 0 },
    animate: { rotate: [0, -10, 12, 0], transition: { duration: 0.5, ease: 'easeInOut' } }
  },
  up: {
    normal: { y: 0 },
    animate: { y: [0, -2, 0], transition: { duration: 0.45, ease: 'easeInOut' } }
  },
  'up-right': {
    normal: { x: 0, y: 0 },
    animate: { x: [0, 1.75, 0], y: [0, -1.75, 0], transition: { duration: 0.45, ease: 'easeInOut' } }
  },
  wiggle: {
    normal: { rotate: 0 },
    animate: { rotate: [0, -5, 5, -3, 0], transition: { duration: 0.48, ease: 'easeInOut' } }
  }
};

const animatedElements = {
  circle: motion.circle,
  ellipse: motion.ellipse,
  line: motion.line,
  path: motion.path,
  polygon: motion.polygon,
  polyline: motion.polyline,
  rect: motion.rect
};

export function useContainingControlAnimation(
  iconRef: RefObject<Element | null>,
  controls: ReturnType<typeof useAnimation>,
  reducedMotion: boolean | null
) {
  useEffect(() => {
    const icon = iconRef.current;
    if (!icon || reducedMotion) return;

    const owner = icon.closest<InteractiveElement>(INTERACTIVE_SELECTOR);
    if (!owner) return;

    let pointerInside = false;
    let focusInside = owner.contains(document.activeElement);

    const animate = () => {
      void controls.start('animate');
    };
    const reset = () => {
      if (!pointerInside && !focusInside) void controls.start('normal');
    };
    const handlePointerEnter = () => {
      pointerInside = true;
      animate();
    };
    const handlePointerLeave = () => {
      pointerInside = false;
      reset();
    };
    const handleFocusIn = () => {
      focusInside = true;
      animate();
    };
    const handleFocusOut = (event: Event) => {
      focusInside = owner.contains((event as FocusEvent).relatedTarget as Node | null);
      reset();
    };
    const handleActivation = () => {
      controls.set('normal');
      animate();
    };

    owner.addEventListener('pointerenter', handlePointerEnter);
    owner.addEventListener('pointerleave', handlePointerLeave);
    owner.addEventListener('focusin', handleFocusIn);
    owner.addEventListener('focusout', handleFocusOut);
    owner.addEventListener('click', handleActivation);

    return () => {
      owner.removeEventListener('pointerenter', handlePointerEnter);
      owner.removeEventListener('pointerleave', handlePointerLeave);
      owner.removeEventListener('focusin', handleFocusIn);
      owner.removeEventListener('focusout', handleFocusOut);
      owner.removeEventListener('click', handleActivation);
    };
  }, [controls, iconRef, reducedMotion]);
}

const AnimatedIcon = forwardRef<
  SVGSVGElement,
  AnimatedIconProps & { iconNode: IconNode; iconName: string; motionKind: IconMotion }
>(function AnimatedIcon(
  {
    iconNode,
    iconName,
    motionKind,
    color = 'currentColor',
    size = 24,
    strokeWidth = 2,
    absoluteStrokeWidth = false,
    'aria-hidden': ariaHidden,
    'aria-label': ariaLabel,
    ...props
  },
  forwardedRef
) {
  const controls = useAnimation();
  const reducedMotion = useReducedMotion();
  const iconRef = useRef<SVGSVGElement>(null);
  const draws = motionKind === 'draw';

  useImperativeHandle(forwardedRef, () => iconRef.current as SVGSVGElement, []);
  useContainingControlAnimation(iconRef, controls, reducedMotion);

  const numericSize = typeof size === 'number' ? size : Number.parseFloat(size);
  const renderedStrokeWidth =
    absoluteStrokeWidth && Number.isFinite(numericSize)
      ? (Number(strokeWidth) * 24) / numericSize
      : strokeWidth;

  return (
    <svg
      ref={iconRef}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={renderedStrokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={ariaHidden ?? (ariaLabel ? undefined : true)}
      aria-label={ariaLabel}
      data-animated-lucide={iconName}
      {...props}
    >
      <motion.g
        initial="normal"
        animate={draws ? undefined : controls}
        variants={draws ? undefined : MOTION_VARIANTS[motionKind]}
        style={{ transformOrigin: 'center' }}
      >
        {iconNode.map(([elementName, attributes]) => {
          const MotionElement = animatedElements[elementName];
          const { key, ...elementProps } = attributes;
          return (
            <MotionElement
              key={key}
              {...elementProps}
              initial={draws ? 'normal' : undefined}
              animate={draws ? controls : undefined}
              variants={draws ? DRAW_VARIANTS : undefined}
            />
          );
        })}
      </motion.g>
    </svg>
  );
});

export function createAnimatedIcon(
  iconName: string,
  iconNode: IconNode,
  motionKind: IconMotion
): AnimatedLucideIcon {
  const Icon = forwardRef<SVGSVGElement, AnimatedIconProps>((props, ref) => (
    <AnimatedIcon
      ref={ref}
      iconName={iconName}
      iconNode={iconNode}
      motionKind={motionKind}
      {...props}
    />
  ));
  Icon.displayName = iconName;
  return Icon;
}
