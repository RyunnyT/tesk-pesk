/* 👧 여자 아바타 — LPC 여성 몸·머리와 여성 의상
   원작자·라이선스는 avatar-sprites.js 와 같습니다 (CC-BY-SA 3.0 / GPL 3.0).
   출처: Universal LPC Spritesheet Character Generator
         body/bodies/female/idle.png, head/heads/human/female/idle.png,
         torso/clothes/blouse(_longsleeve)/female, legs/skirts/*
   기존과 똑같이 64x64 정면(아래 보기) 프레임만 잘라 담았습니다.

   · avatar-sprites.js 다음에 로드해야 합니다.
   · AV_SPRITES 에 그림을 더하고 AV_MANIFEST 에 옷을 등록하므로,
     가격 설정·판매 중지·레벨 잠금 같은 기존 옷장 기능이 그대로 적용됩니다.
   · 치마와 블라우스는 top/bottom 부위라 🎨 색 고르기도 그대로 동작합니다.
*/
(function(){
'use strict';
if(!window.AV_SPRITES || !window.AV_MANIFEST){
  console.warn('avatar-female: avatar-sprites.js 를 먼저 불러와야 합니다');
  return;
}

const SPR = {
"base/base_body_f": "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAADK0lEQVR42u2ZMUsjQRTH/xPuK8RNQEK6sMUKIdU1IpiAYGHlNdpoYXOkEfwCtoE0YnOFZxGbs7IICCYgaa4KgdtiSRdCIFnzIfYKfePs7ObIkZ2YyPuBYDYz47437/3fmxFgGIZhGIZhGIZhGIZhGIZhGIZhGIZhGIZhPjfC9B8oZPPBIvP744FYWwcUsvngT+uH/DztdTAZ+ui2vNjxpbKNTM5Curgtn22Vz4w6QZg0vl07xsbedwBA4LvSCQAwGfqh8ZmcBQDSeGE5AICXx2vsXjSMOeGLyQggY8h49RnQkU7Qd53mCMt5e94w9o4pk7uvGu8+3Eeck8lZscbTWJrbrh0vrCUfEgGU85mcha2zy9DuhqMBobDfOnPw8ngt55okZWL3z+1NmefdlhcxdN706bY8mSbn9qaRKDASAaWyHYmEdPF9h4X1usMqJJYUISSWoTW90XpogHNwCADotjzU31562usg8F0EvhsxntSevifj695Ilkxac6UjoJDNB3fVCoTlYDJ8F73mzTNKZTv0TBU/0gr1e7VXmAx9bOw5uKtWcHT1FCRZEkXSDnDd3wCAn98OUfdG6I8HgnQhrtGJE02KHHXuya9X5zjO10R7glTSu085XCrbEeGaR9HVMarjqHLcVSuJimHKRO7T76oY7p/uzL2OOrZUtiPrrrQI0k7dVi/ly1JZVEM9LvxVaI5zcIjb6mWko1xJB9CL6p/VSKC6Pu11Qj/6+YDmzFpz5RzQHw9E3RvJNlYNY134mjfPIWMnQx/Nm+dIm6ynhPtwL8VxZU+DcQLVrh2HSh4ZSz0Chfv+6U5o3O5Fw/j9QOKdoP6ChWw+mAx9pIvhru7o6kmOrQOyguipYvpCJIUl0G15Ms//dS5Qd3/WpcnaOYC0Qc35OOP0zi/pXP+Q4/CsUqcb1x8PRB0I9mPK49pHgN7h6VdhcXlv+g5gqQ5QW2QyTm+RqeVVDU+65f3QFNBPfnFne2p81DvDtY8A2n1V+fUmZ1azlC5uLyUKjKfAIocXU5cgS3WAesiZ9joQlhO55++PB2L3ogFhOZHx+Iz/GptV3/9nLMMkw19f4buTWu6zuQAAAABJRU5ErkJggg==",
"base/base_head_f": "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAACHklEQVR42u3YMUgbURgH8P/Fbl0jl0BIs4ULWBHXQyRmUBw6detQHNQlS6RrbbsGbukUAsWhq2OXYIsenaRyUAmHS5EQMOkhiBRiKPR16R33YiwReY9E/z+4Ibx37/J979377g4gIiIiIiIienAMnRfLp3NilH4nZ6fa/tcjnYFXrAzmSxZSWRPTcwtRe+C5AIBOq4ujPR8OIHQlwtARfMXKYHVtUQp6mGuJ8NvKk2CMS/DDEvHpw77yJCRUr4B48IY5Ex3/E/afL1nKb8+E6tm/zcwPSmVNVKzMyJvn2K2Au8ygrlWgtAqksqb0W3SP7zzGxO0B444JUDl4p9UdizG0JyCsAPGaflvx81RWAmUr4OX711Iw4XFTUuJtg+3xsSaqCsw8e37t8RbYx+ra4tD+O+V3UelLZU10Wl1pjIlZASdnp8bT0rp0D1eXt+H4bTh+G1uFTSmowHOxVdiM2qvL29J4S68+KnscVroJBp77b9aBupUEAMyWHdStpPSEOD23gLqVxGzZkfoe7flKZ1/La3A+nRO1oi36zYYo2CuiYK+Iy96V6Dcb0nHZu4ra+82GqBVtEZ4/8R9E8umc+Fx9MfJ7QeC5Spd93JSOBJz/unibv/jzZur3TyR653icfnJj4D8OD3Gw+w07x9+Ne/dJrFa0RXyXD1dE4LmxKgFsfPlq3MtvgoOJGKQzcCIiIiIiIiIiIiIiIiJ6WP4CJiH8WBKeExQAAAAASUVORK5CYII=",
"top/t_blouse_pink": "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAABzUlEQVR42u3XMWvCQBQH8L/FwcWCqJDBBBEHB1FwcCoO0t3FyS+Rz5IvIRS6uBcnF8cUCw5FJDoIKhFduqVDvBiT1KHlUpX/b4o57/Dde+9MACIiIiIiIiIiIiIiIiIiIiK6bwmZi6tZzfF/XmythMx5V7UBalZzjHo1dF83Jz8G9Js5f5WUGXyj1XQzON9jbU2R1yqAObk4N69VvO+qxUcAgAFAN+HI2IQHGcF3SgoarSYW831o3KhX0S3XnOD9brkWmf3FfI9Gq4lOSQm1xtVWQDud87IOVEIZ7rmXzuvne0IE39MKboUEghdrtNM5DLDC1VfAYmsldHNyKnkALx+j0CZElb6fmCNaQtY5IO0Q9Jd5Tyt4wajFR681jNGbe8g9Pbvtcxxzsw70raW3nqiWm2gB/w+O6ncRqAhc3Lu0jixJxKBvLdHTCpFngr/fAURm/2YfhILtoGRSZwel6Pu1NcXwsPHGVvZXLNmXcghGGds7KJkU2ulcKHhxNvjHlEwKY3sXSwXEsgEiq8PDBu107izbgn9MVMBdbcDY3mEwO/2Pi14PXg9mq9iyH9sZEPWiE3zq04+PyDJffK5iA/7jjY+IiIiIiIiIznwD70zNUYfHkEIAAAAASUVORK5CYII=",
"top/t_blouse_sky": "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAB1UlEQVR42u3Xv2vCQBQH8Gdwdegm/gOZoy5VcKlgoAjiHyDuBcciiJMI4tjSWfAPEEEKinQR1EESXQPOoosOzpoO7V3Njzq03FXL9zPpnRfz3rt7JEQAAAAAAAAAAAAAAAAAAAAA8L8FRF48Egrbp99X+3VA5LqLSkAkFLbrnZ5nvJLPfhvQT9ZcpEgobLeGM5uZbA92azizJ9uD7a6ue93pb5nWcHZ23W8oIoJPFcpUTMdpujt65uudHmma7glG03Tf6k93Ryqm45QqlElEEhQRWc3kkjTdHckyTE8S1FiUSs2aIwmaptulZo3UWNQTPLtGJpekq9gBq/06UMlnyTJMHtBT9dmTBDf3GFujxqJkGaawPiCssZxWuNSs8WBubxS+Kx7u7omI6OXtlYiIz1mG+ZGExyq/3nzeF3KvQVEJYDfsd95ZoCxwNnbuOqIoJAGrJDvPfs2RjftV/2ofhNzHQU3ojkbJzr1lmDTojvmcNelLqb60HbBZLkhN6LyTnwbPeoNjLqHTZrmQsgOCJAmraiaXpEF37On6g+6Yz7HfyqDI+qPNckGjduMrIZ9n3f151G5Iq760HuD3ouN+6qvks8JffC4iAX/xxgcAAAAAAAAADu8yh/OXaUffUQAAAABJRU5ErkJggg==",
"top/t_blouse_white": "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAB10lEQVR42u3XMWvCQBQH8L/FD2G7qLhkEwel4OYkgh9BEHSQirOjODqLRYqi0C9QKJZ2cVFQKihuASnqYPRbpEO5cCapQ8ulWv6/SXO503fv3iMBiIiIiIiIiIiIiIiIiIiIiOh/86lcXAuETPm7ftj4VM47qw3QAiGz0605rhcL9W8D+smcs6QFQuZ40DOFnTExx4OeuTMmpj279nnyvcJ40Ds57zeuVARfKeWRzORh7KeO8U63hmwm5wgmm8m5Zt/YT5HM5FEp5aFiE/wqdjUaD8LYT7Fe6I6xcExDtQwAMJ9fHn0i+Go5hXBMcwQv1ojGg0D7Ak6Aftj4ioU61gvdCujp4c2xCW4bIxNzwjEN64WurA8oayzyMa+WU1YwN9e3VmmUivcAgHbnDgCsMZH1RmtorSdOy0WUgPyH3epdBCoCF9dOraOKHx5otIaollOuPUGudwCu2b/YByF7OaQTkaNGKep+vdCxnG2tsdf3D0+yr6QJulnNR0gnIl+d3Ba86A3yWDoRwWo+8uQEeFICclaj8SCWs62j6y9nW2tM3OuFK69+aDUfodnuW9/lfiB/brb7nmXfsx7g9qJjf+orFurKX3zOYgP+4o2PiIiIiIiIiI58AhaL5xKSzVd+AAAAAElFTkSuQmCC",
"top/t_blouse_lav": "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAACAklEQVR42u2Xv2rbUBTGP5WOGWxEIEsQBIIDQiBvBq8mbxAwKcRzn8G0Q4ufIbugJeA3CH0AbbpwMcQYCsKLIQh5yK4O9blIlupCm1uL8v0m+1zdg77z714BhBBCCCGEEEIIIYQQQgghhBBCCCHk/8ax6dztBkX5f5Zrx+a+VgXA7QbFXTir2SM1/aWgP9nzt7y1KX4yGgIAlukW8WqBwaWPSB3eO7j0zbM9r7OzzhCpaWEjCG9siA/ObzAZDbFMt7X1u3AG/+K22Lf7F7eN2V+mW0xGQwTnN7XWaG0F9N3QZB3waxkGxgBQLL5/dUT8tTferVXFi4++G0Kv52h9BWS5diI1NWUMAPfxl4Yg4KBN9khL2JoDjo0WOOsGFdu1NzZiel7HtManbx8AAB9HnwHArP3MOvCYPlT8bHL96kGw0gKnJ1fouyGSTOH55am2LkJFuNh+52uT6/a3AAC8H7wDACNeMhmvFlim28bhKPb97IsP8dnqISgnQM/r4D5WpmzPugEe0wecnlwhyZQZlNL38Wph7GXRsjfJlDkJNPCqx6Fj8+YnQ1ECI6VcFi9IEOQZvZ6bvU0+W1kBh17s+eUJyS7zSaZqASiLL88Nm9dgazOgiU2uK+e49Pr+b72eWxl2R/kYOtQm+7e+SE3/ScaPHoBjfPERQgghhBBCCCGkwg8KbBDeNf4z1wAAAABJRU5ErkJggg==",
"top/t_blouse_rose": "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAB6UlEQVR42u3XzWrCQBQF4JNqJAsLlQSkhYo/Jbh00U2ge9/BB8w7uC+46RMEUbGgmwQEuxCjpIt00kwSLbROG8r5VjrJDN47904iQERERERERERERERERERERET/m6Zy8XuzFaW/vwZLTeW8UiXg3mxFo4fr3Lg73Z4M6DtzfqqqMnin3wAAeDMfwb4Cs3b8cq5ZOyb32l3rMwloRSqScKUieOdGh9NvwJv5ueujh2sMmr0oOz5o9gp335v5cPoNODd6rjVKmQAA6FhGsuvZJJi1I4ZtQ0rCoNmLhm0jVyHpNTqWoaRVL56A12CpudOtVPIvqzCXhKLSTxNzREuoOgc0FS1gVnVpbNg2kmDsrpVUhevFQY7s+H5xLdhXAADjxU5aJziEF0+Ckhaw63HQdv3E9Y/DbWTrUvDfWauUCXi8i4Py3iDtpOjnosNRjGd3X6wh1iz1Y1A8AeyuBfd5nZStWdUxXuxg14F56qAUfR/sK5j7otzDJGgxd+7v4DzdwlmtgQs/DjWVb37iUBSJ6VgG5v5OCj7p748kiHsmmzCZW7RmKSvg3A+Ld/UzQDNT0ungRQWofg1WdgYUCQ4hJptQ2vGiz5NNiOAQ/o8/Q+faJPvW5063v7Ljf56Av/jHR0RERERERESSd7vN+cgOmqJsAAAAAElFTkSuQmCC",
"bottom/l_skirt_plain": "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAABkElEQVR42u3XsWrCUBQG4N/iQ6hLlCzpFBwShG4uDZ36CJ26+ACOujqLIKIQ6NBVKIgOdSnSYsCSqUIRm0HtW9ihvTGxoUhLLpj+36LgBXP+nHtuAhARERERERERERERERERERERERERERHR72iZ/FbL5Ldxrf+LlIw/Wa0ft7lsCafZwkHru70aXMdDpV6P/frSMgJYPs8BAC+bJSYDO/RboaiF1gCA63gYThdSujMtaxtEFWiZ6reCLVPFcLpAtVLG3eAmOQG4juffbVFs8FOEoRsKdEOB63hSrutExgAU3/udkX+Xhf0wXMfzO0LGIEzFXfz97NbfAo3WGJapQjcUv9hg8UEipGbbxvz9LZWIIVitlNFojf1Wv7w+D80GQWwBGYMw9gBy2VIoCDHkhLOLKwB26FTod0bJPQVE++8KtL9CANabp1DxlqnidfZw3AFMBrsCfwoh6jjUDQVoH3kHfA46G4WiFvnQE2z1/eMwEVug2bb9u9jt1SLXRBUuwkrEu0DUM8Gh4jwCiYj+vQ+carjfGtfbPQAAAABJRU5ErkJggg==",
"bottom/l_skirt_belle": "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAACOklEQVR42u2XwWriUBSG/0gfQt2ohIHsxILiYmbTjcJsfASHigjiusva5axLi5SW+gjdtGQ2s5kWSgKV7AIlqJvWt0g3czLXJM5Ahxsa+L/VNecm5v/POTf3AoQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEELeh1WshlaxGuqa/z8UsjJhMupHwtLEqbHJqJ9Zcows/uRsOo0E206AbsvE6WyeMEhiwng61f5+e1k5XW9W8P3sJ7otE/VmBRP0UW9WAACeu47GthPgaHwAz11n8l57WYo/Gh8kBEtcrsXn5r4F7m+vQxFXa1i4ufgRjVWWCx+eu0Zv2InG9WYFn79+M3K5CFrFaiji49Ug4sulNsqlNgCg1rC2qkIq5f72WusXoaBLvLqSi+jlwo/ELxf+VvbFBJmjmiFfkFxVgNrXarlLxtNQY2JCfL3IjQG1hgXbCSJhu7K/qwrEDNsJEuvFhzbAKlbDy6vjLSOkn+MGpY3Vuer1y6tjLW1Q0JX90eAc3ZaJcqmNh7v5P8s/3gYPd3OUS210WyZGg3NtVaDFAClndaPTG3YSGU7LOgD0hp3otzwjrW0+pAH+ZmUMDk8SJSyZfXl93HmvxOKLIQAMDk/gb1ZGrg5Dy4WPl9dH2E4QiZNMqiJlLDH1Hl2Z17oV9jcrA08IPddMtMXf9vieu0at8Ue07Aifn35pyb7Ws4C/WRmns3mIGfBp/8uWCbYToBdrBTkJqhmXVtIlPrPj8Hs/XzqFk9+8AdSVFPRwvCbGAAAAAElFTkSuQmCC",
"bottom/l_skirt_straight": "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAABbElEQVR42u3XsWqDQBwG8M+jDxFdEje3YqDgnqFr1mxOIRR8hj5EFocUsvUVunTqIilEugmlmC6at7BDOXs2hkjAi4bvNx3Hidx3d/9TgIiIiIiIiIiIiIiIiIiIiIiIiIiIiIjO4wxGhY5nznGjO4RkvzO6MHHtAQQLHwCwDNdFw3HXEYAzGBWrp0fYrlP23d4Ny/bH+3dl/HR+jzROEMDHMlwXp3ZMb3YAAFimh+n8t53GCWzXqQQj2a5zEExbhI6X1E2yK4TO1c/yqHOhCN0vTOMElunV9sugriYAWQCPBVHXVothsPBbvxZFF87/JY+D0H3+j1X3/yHU7Yre14Amk8ryCJbp9f8aVM+/Wv1fNl8HK15X+OS4tuuAaPv8q5M7tapyh2R5hHD1UIbQyy/BZL8zJuNZuXLqbSB3hPwaVAOTfZPxDADwuX1Dm5/DBi7wS/y6fa7UAxmCnHSTv8beBdDkl1fXpIn+/ABwz4uO/zRIXAAAAABJRU5ErkJggg==",
"bottom/l_skirt_slit": "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAA/ElEQVR42u3XPw6CMBTH8YfhEIyydYUreApnvYfxDC4MkLh5Ck9gonHrpm7coi5ikD9hgZbU72cipEl5v742RQQAAAAAAAAAAAAAAAAAAAAA4J/AxiQqWprqWZfPYKyxYwhtJZ0XO4kTJat0bYbGiYjcLy85ZEczdQhWAtDlM9hu9iYvdnK+nuRx053j4kT9vsim/7bQ9p573PS30GYQfcFMaWFrok8XtFa8teq+BtDVCb2t72sA9S6IE9UKwUVHhK5Wv+8c+Jst4Lr1ZxHAHEKYzSFYD8JmKIGL4lW0NNWNr6vYVbr27yo81An1O4KNwp12QPOnx3bRAFB5A00DVkp+5nLIAAAAAElFTkSuQmCC",
"bottom/l_skirt_over": "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAABiklEQVR42u3Yv06DQBwH8B/Gh6CdYGhyK0xdutStSR/AoZuD0Qdw7OwDaBxoGH0CRl0kwamuTRx0AX2LnxOX6wENLb0K5PtJSAn3u6a/3/3ptUQAAAAAAAAAAAAAAAAAAAAAAAAAAAAADQjbYROxTZ2dKvmRP6mV2D6xnSnAyJ/UGl21Te3T+QIQEd3dTomIKFgtSdgOl13BarkV2xtxFLKwHY6jkOMo5PlswepoC9vh+Wwh2/PY3hQgTy7NEpmoXoC8MGmWyPteLIE0S1hfCq4nCnGuJwpTX+9rgmVy138KbujrYyMTVF34l7T5/bby+Jf181a72u/66pE+128yvhMzQB1N1xM0HIyJiGg4GMvk9ITVGLVgJjdFYwXQk1bdP7wW4vVnVcXoxIkv3/CYWb6q92VnAWE7lfH5xmjicHRuevTLRnWXQ/u19lugyYc3mbjxZbDLriWwT59Wz4Ds572V73XSWaBuaIfOgDRL+JQ/j49eBL0QVQlVxZlO3vqvP0P0U12dGIDj+wOb43A8zgMXawAAAABJRU5ErkJggg=="
};
Object.assign(window.AV_SPRITES, SPR);

/* ── 성별 ──
   몸과 머리 그림만 갈아끼운다. 옷·헤어·표정은 두 몸에 모두 맞으므로 그대로 쓴다. */
window.AV_GENDERS = [{id:'boy', name:'남자', icon:'👦'}, {id:'girl', name:'여자', icon:'👧'}];
window.AV_BODY = function(gender){
  return (gender === 'girl' && window.AV_SPRITES['base/base_body_f'])
    ? {body:'base/base_body_f', head:'base/base_head_f'}
    : {body:'base/base_body',   head:'base/base_head'};
};

/* ── 새 옷 ──
   흰색·회색으로 그려진 치마는 학생이 🎨 색 고르기로 원하는 색을 입힐 수 있다. */
const NEW = {
  top: [
    {id:'t_blouse_white', name:'하양 블라우스', price:260, minLevel:1},
    {id:'t_blouse_pink',  name:'분홍 블라우스', price:280, minLevel:1},
    {id:'t_blouse_sky',   name:'하늘 블라우스', price:280, minLevel:2},
    {id:'t_blouse_lav',   name:'라벤더 긴팔',   price:320, minLevel:3},
    {id:'t_blouse_rose',  name:'장미 긴팔',     price:320, minLevel:4}
  ],
  bottom: [
    {id:'l_skirt_plain',    name:'기본 치마',     price:210, minLevel:1},
    {id:'l_skirt_straight', name:'일자 치마',     price:230, minLevel:1},
    {id:'l_skirt_slit',     name:'트임 치마',     price:250, minLevel:2},
    {id:'l_skirt_over',     name:'겹치마',        price:280, minLevel:3},
    {id:'l_skirt_belle',    name:'주름 드레스',   price:340, minLevel:5}
  ]
};

/* 그림이 실제로 들어온 것만 등록 (일부 추출이 빠져도 옷장이 깨지지 않게) */
Object.keys(NEW).forEach(cat => {
  if(!Array.isArray(window.AV_MANIFEST[cat])) window.AV_MANIFEST[cat] = [];
  NEW[cat].forEach(item => {
    if(!window.AV_SPRITES[cat + '/' + item.id]) return;
    if(window.AV_MANIFEST[cat].some(i => i.id === item.id)) return;
    window.AV_MANIFEST[cat].push(Object.assign({girly:true}, item));
  });
});
})();
