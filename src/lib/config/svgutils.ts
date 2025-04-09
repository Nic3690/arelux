/*
Copyright © 2020 Xah Lee

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

URL: SVG Circle Arc http://xahlee.info/js/svg_circle_arc.html
Version: 2019-06-19
*/

import { DEG2RAD } from 'three/src/math/MathUtils.js';

// Costanti e funzioni matematiche
const TWO_PI = Math.PI * 2;

/**
 * Moltiplica una matrice 2x2 per un vettore 2D
 */
const multiplyMatrixVector = (matrix: number[][], vector: number[]): number[] => [
	matrix[0][0] * vector[0] + matrix[0][1] * vector[1],
	matrix[1][0] * vector[0] + matrix[1][1] * vector[1],
];

/**
 * Crea una matrice di rotazione per l'angolo specificato
 */
const createRotationMatrix = (angleRadians: number): number[][] => [
	[Math.cos(angleRadians), -Math.sin(angleRadians)],
	[Math.sin(angleRadians), Math.cos(angleRadians)],
];

/**
 * Somma due vettori 2D
 */
const addVectors = (v1: number[], v2: number[]): number[] => [
	v1[0] + v2[0], 
	v1[1] + v2[1]
];

/**
 * Genera un percorso SVG che rappresenta un arco di circonferenza
 * 
 * @param radius - Raggio dell'arco
 * @param delta - Ampiezza dell'arco in gradi (verrà convertita in radianti)
 * @returns Stringa del percorso SVG
 */
export function arc(radius: number, delta: number): string {
	// Coordinate del centro (origine)
	const cx = 0;
	const cy = 0;
	
	// Angolo di partenza (fisso a 180°)
	const startAngle = 180 * DEG2RAD;
	
	// Rotazione dell'arco (fisso a 0)
	const phi = 0;
	
	// Converti l'ampiezza dell'arco in radianti e normalizza
	delta *= DEG2RAD;
	delta %= TWO_PI;
	
	// Crea la matrice di rotazione
	const rotationMatrix = createRotationMatrix(phi);
	
	// Calcola le coordinate di inizio dell'arco
	const startPoint = addVectors(
		multiplyMatrixVector(
			rotationMatrix, 
			[radius * Math.cos(startAngle), radius * Math.sin(startAngle)]
		),
		[cx, cy]
	);
	
	// Calcola le coordinate di fine dell'arco
	const endPoint = addVectors(
		multiplyMatrixVector(
			rotationMatrix, 
			[radius * Math.cos(startAngle + delta), radius * Math.sin(startAngle + delta)]
		),
		[cx, cy]
	);
	
	// Flags per l'arco SVG
	const largeArcFlag = delta > Math.PI ? 1 : 0;  // 1 se l'arco è maggiore di 180°
	const sweepFlag = delta > 0 ? 1 : 0;  // 1 se l'arco è disegnato in senso orario
	
	// Formatta il comando SVG path
	return `M ${startPoint[0]} ${startPoint[1]} A ${radius} ${radius} ${(phi / TWO_PI) * 360} ${largeArcFlag} ${sweepFlag} ${endPoint[0]} ${endPoint[1]}`;
}