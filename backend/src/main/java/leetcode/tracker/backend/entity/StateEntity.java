package leetcode.tracker.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "states")
public class StateEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(nullable = false)
    private String label;

    public Integer getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public String getLabel() {
        return label;
    }
}
