export class Vec3 {
    x: number = 0;
    y: number = 0;
    z: number = 0;

    constructor(x: number = 0, y: number = 0, z: number = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    // 基础操作
    /** 克隆向量 */
    clone(): Vec3 {
        return new Vec3(this.x, this.y, this.z);
    }

    /** 从另一个向量复制值 */
    copy(v: Vec3): Vec3 {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        return this;
    }

    /** 重置为指定值 */
    set(x: number, y: number, z: number): Vec3 {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

    // 数学运算
    /** 向量加法 */
    add(v: Vec3): Vec3 {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }

    /** 向量减法 */
    subtract(v: Vec3): Vec3 {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
    }

    /** 向量数乘 */
    multiply(scalar: number): Vec3 {
        this.x *= scalar;
        this.y *= scalar;
        this.z *= scalar;
        return this;
    }

    /** 向量除法 */
    divide(scalar: number): Vec3 {
        if (scalar === 0) throw new Error('Division by zero');
        this.x /= scalar;
        this.y /= scalar;
        this.z /= scalar;
        return this;
    }

    /** 点积 */
    dot(v: Vec3): number {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    /** 叉积（3D向量积） */
    cross(v: Vec3): Vec3 {
        const x = this.y * v.z - this.z * v.y;
        const y = this.z * v.x - this.x * v.z;
        const z = this.x * v.y - this.y * v.x;
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

    /** 向量长度 */
    length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    /** 向量长度平方（性能更优） */
    lengthSquared(): number {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }

    /** 距离到另一个点 */
    distance(v: Vec3): number {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        const dz = this.z - v.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /** 距离平方到另一个点（性能更优） */
    distanceSquared(v: Vec3): number {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        const dz = this.z - v.z;
        return dx * dx + dy * dy + dz * dz;
    }

    /** 规范化向量（转为单位向量） */
    normalize(): Vec3 {
        const len = this.length();
        if (len === 0) return this;
        this.x /= len;
        this.y /= len;
        this.z /= len;
        return this;
    }

    /** 向量反向 */
    negate(): Vec3 {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        return this;
    }

    /** 两向量夹角（弧度） */
    angle(v: Vec3): number {
        const cosAngle = this.dot(v) / (this.length() * v.length());
        return Math.acos(Math.max(-1, Math.min(1, cosAngle)));
    }

    /** 线性插值 */
    lerp(v: Vec3, t: number): Vec3 {
        this.x += (v.x - this.x) * t;
        this.y += (v.y - this.y) * t;
        this.z += (v.z - this.z) * t;
        return this;
    }

    /** 投影到另一个向量 */
    project(v: Vec3): Vec3 {
        const scalar = this.dot(v) / v.lengthSquared();
        this.x = v.x * scalar;
        this.y = v.y * scalar;
        this.z = v.z * scalar;
        return this;
    }

    /** 夹紧到指定范围 */
    clamp(max: number): Vec3 {
        const len = this.length();
        if (len > max) {
            const scalar = max / len;
            this.x *= scalar;
            this.y *= scalar;
            this.z *= scalar;
        }
        return this;
    }

    /** 获取XY平面的2D距离（用于水平平面碰撞检测） */
    distanceXY(v: Vec3): number {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /** 获取XY平面的2D距离平方 */
    distanceXYSquared(v: Vec3): number {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return dx * dx + dy * dy;
    }

    /** 等于另一个向量 */
    equals(v: Vec3, epsilon: number = 0.0001): boolean {
        return Math.abs(this.x - v.x) < epsilon && 
               Math.abs(this.y - v.y) < epsilon && 
               Math.abs(this.z - v.z) < epsilon;
    }

    /** 向量转字符串 */
    toString(): string {
        return `Vec3(${this.x.toFixed(2)}, ${this.y.toFixed(2)}, ${this.z.toFixed(2)})`;
    }

    // 静态工厂方法
    static zero(): Vec3 {
        return new Vec3(0, 0, 0);
    }

    static one(): Vec3 {
        return new Vec3(1, 1, 1);
    }

    static up(): Vec3 {
        return new Vec3(0, 1, 0);
    }

    static down(): Vec3 {
        return new Vec3(0, -1, 0);
    }

    static left(): Vec3 {
        return new Vec3(-1, 0, 0);
    }

    static right(): Vec3 {
        return new Vec3(1, 0, 0);
    }

    static forward(): Vec3 {
        return new Vec3(0, 0, 1);
    }

    static backward(): Vec3 {
        return new Vec3(0, 0, -1);
    }

    /** 两向量之间的最小坐标向量 */
    static min(a: Vec3, b: Vec3): Vec3 {
        return new Vec3(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.min(a.z, b.z));
    }

    /** 两向量之间的最大坐标向量 */
    static max(a: Vec3, b: Vec3): Vec3 {
        return new Vec3(Math.max(a.x, b.x), Math.max(a.y, b.y), Math.max(a.z, b.z));
    }
}
