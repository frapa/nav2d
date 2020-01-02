export const EPS = 1e-8;

export class Vector {
    constructor(x, y) {
        if (typeof x !== "number" || typeof y !== "number") {
            throw new Error("Vector components must be numbers.");
        }

        this.x = x;
        this.y = y;
    }

    _normOther(other) {
        if (typeof other == "number") {
            return new Vector(other, other);
        }
        return other;
    }

    add(other) {
        other = this._normOther(other);
        return new Vector(this.x + other.x, this.y + other.y);
    }

    subtract(other) {
        other = this._normOther(other);
        return new Vector(this.x - other.x, this.y - other.y);
    }

    mult(other) {
        other = this._normOther(other);
        return new Vector(this.x * other.x, this.y * other.y);
    }

    divide(other) {
        other = this._normOther(other);
        return new Vector(this.x / other.x, this.y / other.y);
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
}

export function dot(a, b) {
    return a.x * b.x + a.y * b.y;
}

export function cross(a, b) {
    return a.x * b.y - a.y * b.x;
}

export function isclose(a, b, eps = EPS) {
    return a > b - eps && a < b + eps;
}
