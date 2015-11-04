// ===========================================================================================
// percentile calculation that matches python numpy.percentile with interpolation='linear'
// import numpy
// a=[2, 4, 7, 10]
// for p in [0, 25, 33, 50, 66, 75, 100] : print numpy.percentile(a, p, interpolation='linear')
// ============================================================================================
// var data = [4, 7, 10, 2];

function sortNumber(a,b) {
    return a - b;
}

function percentile(array, p) {
    array.sort(sortNumber);
    index = p/100. * (array.length-1);
    if (Math.floor(index) == index) {
    	result = array[index];
    } else {
        i = Math.floor(index)
        fraction = index - i;
        result = array[i] + (array[i+1] - array[i]) * fraction;
    }
    return result;
}

// function logArrayElements(element, index, array) {
//     console.log(element + " --> " + percentile(data, element));
// }

// [0, 25, 33, 50, 66, 75, 100].forEach(logArrayElements);