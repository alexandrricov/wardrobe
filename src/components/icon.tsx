export type IconName =
  | "loading"
  | "house"
  | "house-fill"
  | "clipboard"
  | "clipboard-fill"
  | "gear"
  | "gear-fill"
  | "chart-bar"
  | "chart-bar-fill"
  | "chevron-down"
  | "chevron-up"
  | "close"
  | "plus"
  | "tshirt"
  | "tshirt-fill";

type IconProps = React.SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: number;
};

export const Icon = ({
  name,
  size = 24,
  ...props
}: IconProps & React.SVGProps<SVGSVGElement>) => {
  return (
    <svg width={size} height={size} {...props}>
      <use
        xlinkHref={`${import.meta.env.BASE_URL}icons-sprite.svg#icon__${name}`}
      />
    </svg>
  );
};
