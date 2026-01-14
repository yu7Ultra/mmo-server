export class Float4 {
    x: number = 0;
    y: number = 0;
    z: number = 0;
    w: number = 0;

    constructor(x: number = 0, y: number = 0, z: number = 0, w: number = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }

    // 基础操作
    /** 克隆向量 */
    clone(): Float4 {
        return new Float4(this.x, this.y, this.z, this.w);
    }

    /** 从另一个向量复制值 */
    copy(v: Float4): Float4 {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        this.w = v.w;
        return this;
    }

    /** 重置为指定值 */
    set(x: number, y: number, z: number, w: number): Float4 {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
        return this;
    }

    // 数学运算
    /** 向量加法 */
    add(v: Float4): Float4 {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        this.w += v.w;
        return this;
    }

    /** 向量减法 */
    subtract(v: Float4): Float4 {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        this.w -= v.w;
        return this;
    }

    /** 向量数乘 */
    multiply(scalar: number): Float4 {
        this.x *= scalar;
        this.y *= scalar;
        this.z *= scalar;
        this.w *= scalar;
        return this;
    }

    /** 向量除法 */
    divide(scalar: number): Float4 {
        if (scalar === 0) throw new Error('Division by zero');
        this.x /= scalar;
        this.y /= scalar;
        this.z /= scalar;
        this.w /= scalar;
        return this;
    }

    /** 点积 */
    dot(v: Float4): number {
        return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w;
    }

    /** 向量长度 */
    length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
    }

    /** 向量长度平方（性能更优） */
    lengthSquared(): number {
        return this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
    }

    /** 规范化向量（转为单位向量） */
    normalize(): Float4 {
        const len = this.length();
        if (len === 0) return this;
        this.x /= len;
        this.y /= len;
        this.z /= len;
        this.w /= len;
        return this;
    }

    /** 向量反向 */
    negate(): Float4 {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        this.w = -this.w;
        return this;
    }

    /** 线性插值 */
    lerp(v: Float4, t: number): Float4 {
        this.x += (v.x - this.x) * t;
        this.y += (v.y - this.y) * t;
        this.z += (v.z - this.z) * t;
        this.w += (v.w - this.w) * t;
        return this;
    }

    /** 投影到另一个向量 */
    project(v: Float4): Float4 {
        const scalar = this.dot(v) / v.lengthSquared();
        this.x = v.x * scalar;
        this.y = v.y * scalar;
        this.z = v.z * scalar;
        this.w = v.w * scalar;
        return this;
    }

    /** 夹紧到指定范围 */
    clamp(max: number): Float4 {
        const len = this.length();
        if (len > max) {
            const scalar = max / len;
            this.x *= scalar;
            this.y *= scalar;
            this.z *= scalar;
            this.w *= scalar;
        }
        return this;
    }

    /** 等于另一个向量 */
    equals(v: Float4, epsilon: number = 0.0001): boolean {
        return Math.abs(this.x - v.x) < epsilon && 
               Math.abs(this.y - v.y) < epsilon && 
               Math.abs(this.z - v.z) < epsilon && 
               Math.abs(this.w - v.w) < epsilon;
    }

    /** 向量转字符串 */
    toString(): string {
        return `Float4(${this.x.toFixed(2)}, ${this.y.toFixed(2)}, ${this.z.toFixed(2)}, ${this.w.toFixed(2)})`;
    }

    // 四元数专用方法（当用作四元数时）
    /** 四元数乘法 */
    multiplyQuaternion(q: Float4): Float4 {
        const ax = this.x, ay = this.y, az = this.z, aw = this.w;
        const bx = q.x, by = q.y, bz = q.z, bw = q.w;

        this.x = ax * bw + aw * bx + ay * bz - az * by;
        this.y = ay * bw + aw * by + az * bx - ax * bz;
        this.z = az * bw + aw * bz + ax * by - ay * bx;
        this.w = aw * bw - ax * bx - ay * by - az * bz;
        return this;
    }

    /** 四元数共轭（用于四元数逆） */
    conjugate(): Float4 {
        this.x = -this.x;
        this.y = -this.y;
        this.z = -this.z;
        return this;
    }

    /** 四元数逆 */
    invert(): Float4 {
        const dot = this.lengthSquared();
        if (dot === 0) throw new Error('Cannot invert zero quaternion');
        this.conjugate();
        return this.divide(dot);
    }

    // 静态工厂方法
    static zero(): Float4 {
        return new Float4(0, 0, 0, 0);
    }

    static one(): Float4 {
        return new Float4(1, 1, 1, 1);
    }

    /** 单位四元数（恒等旋转） */
    static identity(): Float4 {
        return new Float4(0, 0, 0, 1);
    }

    /** 两向量之间的最小坐标向量 */
    static min(a: Float4, b: Float4): Float4 {
        return new Float4(
            Math.min(a.x, b.x),
            Math.min(a.y, b.y),
            Math.min(a.z, b.z),
            Math.min(a.w, b.w)
        );
    }

    /** 两向量之间的最大坐标向量 */
    static max(a: Float4, b: Float4): Float4 {
        return new Float4(
            Math.max(a.x, b.x),
            Math.max(a.y, b.y),
            Math.max(a.z, b.z),
            Math.max(a.w, b.w)
        );
    }
}
