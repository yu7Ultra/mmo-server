export class Vec2 {
    x: number = 0;
    y: number = 0;

    constructor(x: number = 0, y: number = 0) {
        this.x = x;
        this.y = y;
    }

    // 基础操作
    /** 克隆向量 */
    clone(): Vec2 {
        return new Vec2(this.x, this.y);
    }

    /** 从另一个向量复制值 */
    copy(v: Vec2): Vec2 {
        this.x = v.x;
        this.y = v.y;
        return this;
    }

    /** 重置为指定值 */
    set(x: number, y: number): Vec2 {
        this.x = x;
        this.y = y;
        return this;
    }

    // 数学运算
    /** 向量加法 */
    add(v: Vec2): Vec2 {
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    /** 向量减法 */
    subtract(v: Vec2): Vec2 {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }

    /** 向量数乘 */
    multiply(scalar: number): Vec2 {
        this.x *= scalar;
        this.y *= scalar;
        return this;
    }

    /** 向量除法 */
    divide(scalar: number): Vec2 {
        if (scalar === 0) throw new Error('Division by zero');
        this.x /= scalar;
        this.y /= scalar;
        return this;
    }

    /** 点积 */
    dot(v: Vec2): number {
        return this.x * v.x + this.y * v.y;
    }

    /** 向量长度 */
    length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    /** 向量长度平方（性能更优） */
    lengthSquared(): number {
        return this.x * this.x + this.y * this.y;
    }

    /** 距离到另一个点 */
    distance(v: Vec2): number {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /** 距离平方到另一个点（性能更优） */
    distanceSquared(v: Vec2): number {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return dx * dx + dy * dy;
    }

    /** 规范化向量（转为单位向量） */
    normalize(): Vec2 {
        const len = this.length();
        if (len === 0) return this;
        this.x /= len;
        this.y /= len;
        return this;
    }

    /** 叉积（2D返回标量） */
    cross(v: Vec2): number {
        return this.x * v.y - this.y * v.x;
    }

    /** 向量反向 */
    negate(): Vec2 {
        this.x = -this.x;
        this.y = -this.y;
        return this;
    }

    /** 两向量夹角（弧度） */
    angle(v: Vec2): number {
        const cosAngle = this.dot(v) / (this.length() * v.length());
        return Math.acos(Math.max(-1, Math.min(1, cosAngle)));
    }

    /** 旋转向量（弧度） */
    rotate(radians: number): Vec2 {
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        const x = this.x * cos - this.y * sin;
        const y = this.x * sin + this.y * cos;
        this.x = x;
        this.y = y;
        return this;
    }

    /** 垂直向量（逆时针90度） */
    perpendicular(): Vec2 {
        const temp = this.x;
        this.x = -this.y;
        this.y = temp;
        return this;
    }

    /** 线性插值 */
    lerp(v: Vec2, t: number): Vec2 {
        this.x += (v.x - this.x) * t;
        this.y += (v.y - this.y) * t;
        return this;
    }

    /** 投影到另一个向量 */
    project(v: Vec2): Vec2 {
        const scalar = this.dot(v) / v.lengthSquared();
        this.x = v.x * scalar;
        this.y = v.y * scalar;
        return this;
    }

    /** 夹紧到指定范围 */
    clamp(max: number): Vec2 {
        const len = this.length();
        if (len > max) {
            const scalar = max / len;
            this.x *= scalar;
            this.y *= scalar;
        }
        return this;
    }

    /** 等于另一个向量 */
    equals(v: Vec2, epsilon: number = 0.0001): boolean {
        return Math.abs(this.x - v.x) < epsilon && Math.abs(this.y - v.y) < epsilon;
    }

    /** 向量转字符串 */
    toString(): string {
        return `Vec2(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`;
    }

    // 静态工厂方法
    static zero(): Vec2 {
        return new Vec2(0, 0);
    }

    static one(): Vec2 {
        return new Vec2(1, 1);
    }

    static up(): Vec2 {
        return new Vec2(0, 1);
    }

    static down(): Vec2 {
        return new Vec2(0, -1);
    }

    static left(): Vec2 {
        return new Vec2(-1, 0);
    }

    static right(): Vec2 {
        return new Vec2(1, 0);
    }

    /** 两向量之间的最小距离向量 */
    static min(a: Vec2, b: Vec2): Vec2 {
        return new Vec2(Math.min(a.x, b.x), Math.min(a.y, b.y));
    }

    /** 两向量之间的最大距离向量 */
    static max(a: Vec2, b: Vec2): Vec2 {
        return new Vec2(Math.max(a.x, b.x), Math.max(a.y, b.y));
    }
}
