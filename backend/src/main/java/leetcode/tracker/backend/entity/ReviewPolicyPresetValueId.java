package leetcode.tracker.backend.entity;

import java.io.Serializable;

import jakarta.persistence.Embeddable;

@Embeddable
public class ReviewPolicyPresetValueId implements Serializable {

    private Integer preset;
    private Integer state;

    public ReviewPolicyPresetValueId() {
    }

    public ReviewPolicyPresetValueId(Integer preset, Integer state) {
        this.preset = preset;
        this.state = state;
    }

    public Integer getPreset() {
        return preset;
    }

    public Integer getState() {
        return state;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof ReviewPolicyPresetValueId that)) {
            return false;
        }
        return java.util.Objects.equals(preset, that.preset)
                && java.util.Objects.equals(state, that.state);
    }

    @Override
    public int hashCode() {
        return java.util.Objects.hash(preset, state);
    }
}
