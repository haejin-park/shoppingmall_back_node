const randomStringGenerator = () => {
    const randomString = Array.from(Array(10), () => 
        Math.floor(Math.random() * 36).toString(36)
    ).join("");   
    return randomString;
}

module.exports = randomStringGenerator;
//orderNum 0~9 숫자 또는 a~z 알파벳

